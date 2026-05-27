import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "dotenv";
import postgres from "postgres";
import {
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
} from "../lib/account-auth";
import { generateHashedPassword } from "../lib/db/utils";
import {
  buyerCreditAccount,
  buyerCreditLedgerEntry,
  user,
} from "../lib/db/schema";
import { addMoneyAmounts, normalizeMoneyAmount } from "../lib/payment";
import { generateUUID } from "../lib/utils";

config({
  path: ".env.local",
});

const client = postgres(process.env.POSTGRES_URL ?? "", {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
});
const db = drizzle(client);

type SeedArgs = {
  amount: string;
  email: string;
  password: string;
  username: string;
};

function usage() {
  console.log("Usage:");
  console.log("  pnpm --filter @boreal/web seed:character-call-demo");
  console.log("");
  console.log("Environment:");
  console.log("  BOREAL_DEMO_EMAIL       Defaults to demo@boreal.local");
  console.log("  BOREAL_DEMO_USERNAME    Defaults to demo");
  console.log("  BOREAL_DEMO_PASSWORD    Defaults to demo-password-change-me");
  console.log("  BOREAL_DEMO_CREDIT      Defaults to 5.00");
  console.log("  ALLOW_BOREAL_DEMO_SEED  Required when NODE_ENV=production");
}

function getSeedArgs(): SeedArgs {
  return {
    amount: normalizeMoneyAmount(process.env.BOREAL_DEMO_CREDIT ?? "5.00"),
    email: process.env.BOREAL_DEMO_EMAIL ?? "demo@boreal.local",
    password: process.env.BOREAL_DEMO_PASSWORD ?? "demo-password-change-me",
    username: process.env.BOREAL_DEMO_USERNAME ?? "demo",
  };
}

function assertSeedAllowed() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is required before seeding demo data.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_BOREAL_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to seed demo data in production without ALLOW_BOREAL_DEMO_SEED=true."
    );
  }
}

async function ensureDemoUser({
  email,
  password,
  username,
}: Pick<SeedArgs, "email" | "password" | "username">) {
  const [emailMatch] = await getUsersByIdentifier(email);
  const [usernameMatch] = await getUsersByIdentifier(username);

  if (emailMatch && usernameMatch && emailMatch.id !== usernameMatch.id) {
    throw new Error(
      `Demo email and username already belong to different users: ${emailMatch.id} and ${usernameMatch.id}.`
    );
  }

  const existingUser = emailMatch ?? usernameMatch;
  if (existingUser) {
    return { created: false, user: existingUser };
  }

  await db.insert(user).values({
    email: normalizeEmail(email),
    password: generateHashedPassword(password),
    username: username.trim(),
    usernameNormalized: normalizeUsername(username),
  });

  const [createdUser] = await getUsersByIdentifier(email);
  if (!createdUser) {
    throw new Error("Demo user creation succeeded but the user was not found.");
  }

  return { created: true, user: createdUser };
}

async function getUsersByIdentifier(identifier: string) {
  const normalizedIdentifier = identifier.trim();
  const lookup = isEmailIdentifier(normalizedIdentifier)
    ? eq(user.email, normalizeEmail(normalizedIdentifier))
    : eq(user.usernameNormalized, normalizeUsername(normalizedIdentifier));

  return db.select().from(user).where(lookup);
}

async function ensureCreditAccount(ownerId: string) {
  const [existingAccount] = await db
    .select()
    .from(buyerCreditAccount)
    .where(
      and(
        eq(buyerCreditAccount.ownerId, ownerId),
        eq(buyerCreditAccount.currency, "USD")
      )
    )
    .limit(1);

  if (existingAccount) {
    return existingAccount;
  }

  const [createdAccount] = await db
    .insert(buyerCreditAccount)
    .values({
      ownerId,
      currency: "USD",
      status: "active",
      availableBalance: "0.00",
      pendingBalance: "0.00",
      lifetimePurchased: "0.00",
      lifetimeGranted: "0.00",
      lifetimeSpent: "0.00",
      lifetimeRefunded: "0.00",
      metadata: {
        profile: "first_party_credit_v1",
        demoSeed: "character_call_starter_v1",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return createdAccount;
}

async function ensureDemoCredit({
  amount,
  ownerId,
}: {
  amount: string;
  ownerId: string;
}) {
  const account = await ensureCreditAccount(ownerId);
  const idempotencyKey = `demo-character-call-credit-v1:${amount}`;
  const [existingLedgerEntry] = await db
    .select()
    .from(buyerCreditLedgerEntry)
    .where(
      and(
        eq(buyerCreditLedgerEntry.buyerCreditAccountId, account.id),
        eq(buyerCreditLedgerEntry.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);

  if (existingLedgerEntry) {
    return {
      account,
      created: false,
      ledgerEntry: existingLedgerEntry,
    };
  }

  const nextAvailableBalance = addMoneyAmounts(
    account.availableBalance,
    amount
  );
  const nextLifetimeGranted = addMoneyAmounts(account.lifetimeGranted, amount);
  const [updatedAccount] = await db
    .update(buyerCreditAccount)
    .set({
      availableBalance: nextAvailableBalance,
      lifetimeGranted: nextLifetimeGranted,
      metadata: {
        ...(account.metadata ?? {}),
        demoSeed: "character_call_starter_v1",
      },
      updatedAt: new Date(),
    })
    .where(eq(buyerCreditAccount.id, account.id))
    .returning();

  if (!updatedAccount) {
    throw new Error("Buyer credit account disappeared during demo seed.");
  }

  const [ledgerEntry] = await db
    .insert(buyerCreditLedgerEntry)
    .values({
      id: generateUUID(),
      buyerCreditAccountId: account.id,
      kind: "grant",
      status: "settled",
      amount,
      currency: account.currency,
      balanceAfter: updatedAccount.availableBalance,
      idempotencyKey,
      reference: "character-call-demo-seed",
      metadata: {
        fundingSource: "buyer_credit",
        reason: "character_call_starter_demo_seed",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      settledAt: new Date(),
    })
    .returning();

  return {
    account: updatedAccount,
    created: true,
    ledgerEntry,
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    usage();
    return;
  }

  assertSeedAllowed();

  const args = getSeedArgs();
  const demoUser = await ensureDemoUser(args);
  const demoCredit = await ensureDemoCredit({
    amount: args.amount,
    ownerId: demoUser.user.id,
  });

  console.log(
    JSON.stringify(
      {
        user: {
          id: demoUser.user.id,
          email: demoUser.user.email,
          username: demoUser.user.username,
          created: demoUser.created,
        },
        buyerCredit: {
          accountId: demoCredit.account.id,
          availableBalance: demoCredit.account.availableBalance,
          grantCreated: demoCredit.created,
          ledgerEntryId: demoCredit.ledgerEntry.id,
        },
        next: {
          signIn: "/login",
          service: "/services/character-call-starter/starter-call",
          expectedCheckout:
            "Fill the Character Call Starter form and pay $1 with credits.",
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
