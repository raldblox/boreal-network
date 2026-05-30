import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeReusablePromptText,
  renderReusablePrompt,
} from "../../lib/reusable-prompts";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const fixturePath = path.join(
  root,
  "fixtures/request/public-chat-prompt-reuse-v0.json"
);

function assert(condition: unknown, message: string, errors: string[]) {
  if (!condition) {
    errors.push(message);
  }
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateAnalyzer(errors: string[]) {
  const prompt =
    "My date of birth is [20/05/1996]. Using global events, cultural changes, and generational psychology, describe common childhood experiences.";
  const analysis = analyzeReusablePromptText(prompt);

  assert(
    analysis.templateText.includes("{{date_of_birth}}"),
    "bracketed DOB example should become {{date_of_birth}}",
    errors
  );
  assert(
    analysis.fields[0]?.key === "date_of_birth",
    "[20/05/1996] near date of birth should infer date_of_birth",
    errors
  );
  assert(
    analysis.fields[0]?.example === "20/05/1996",
    "date_of_birth field should preserve bracket example",
    errors
  );

  const explicit = analyzeReusablePromptText(
    "Compare {date_of_birth} against {{date_of_birth}}."
  );
  assert(
    explicit.fields.length === 1 &&
      explicit.fields[0]?.key === "date_of_birth",
    "explicit placeholder forms should preserve one date_of_birth field",
    errors
  );

  const rendered = renderReusablePrompt({
    fields: analysis.fields,
    inputValues: {
      date_of_birth: "01/01/2001",
    },
    templateText: analysis.templateText,
  });
  assert(
    rendered.includes("01/01/2001") && !rendered.includes("{{date_of_birth}}"),
    "rendered prompt should replace required variable",
    errors
  );

  try {
    renderReusablePrompt({
      fields: analysis.fields,
      inputValues: {},
      templateText: analysis.templateText,
    });
    errors.push("missing required variable should throw before run debit");
  } catch (error) {
    assert(
      error instanceof Error &&
        error.message === "Missing reusable prompt input: date_of_birth",
      "missing required variable error should name date_of_birth",
      errors
    );
  }
}

function validateFixture(errors: string[]) {
  const fixture = readJson(fixturePath);
  const {
    analysis,
    deliveryArtifact,
    fulfillment,
    idempotency,
    ledgerEntry,
    negativeCases,
    runRequest,
    sourceChat,
    sourceMessage,
    transaction,
  } = fixture;

  assert(
    sourceChat.visibility === "public",
    "source chat must be public for public viewer reuse",
    errors
  );
  assert(
    sourceChat.unchangedAfterRun === true,
    "source chat must remain unchanged after run",
    errors
  );
  assert(
    sourceMessage.role === "user",
    "V1 source message must be a user message",
    errors
  );
  assert(
    runRequest.id !== sourceChat.id,
    "run request must be distinct from source chat",
    errors
  );
  assert(
    runRequest.visibility === "private",
    "run request must be private",
    errors
  );

  const reusablePromptRun = runRequest.brief?.constraints?.reusablePromptRun;
  assert(
    reusablePromptRun?.profile === "public_chat_prompt_reuse_v0",
    "run request must carry reusable prompt profile",
    errors
  );
  assert(
    reusablePromptRun?.sourceChatId === sourceChat.id,
    "run request must reference source chat id",
    errors
  );
  assert(
    reusablePromptRun?.sourceMessageId === sourceMessage.id,
    "run request must reference source message id",
    errors
  );
  assert(
    reusablePromptRun?.templateText === analysis.templateText,
    "run request must store template text",
    errors
  );
  assert(
    reusablePromptRun?.inputValues?.date_of_birth === "01/01/2001",
    "run request must store input values",
    errors
  );
  assert(
    transaction.requestId === runRequest.id,
    "transaction must attach to run request",
    errors
  );
  assert(
    transaction.metadata?.sourceChatId === sourceChat.id,
    "transaction metadata must reference source chat",
    errors
  );
  assert(
    transaction.metadata?.sourceMessageId === sourceMessage.id,
    "transaction metadata must reference source message",
    errors
  );
  assert(
    ledgerEntry.kind === "debit" && ledgerEntry.status === "settled",
    "ledger entry must be a settled debit",
    errors
  );
  assert(
    ledgerEntry.requestId === runRequest.id &&
      ledgerEntry.transactionId === transaction.id,
    "ledger entry must attach to run request and transaction",
    errors
  );
  assert(
    runRequest.activeRefs?.latestTransactionId === transaction.id,
    "run request latestTransactionId must reference transaction",
    errors
  );
  assert(
    runRequest.activeRefs?.activeFulfillmentId === fulfillment.id,
    "run request activeFulfillmentId must reference reusable prompt fulfillment",
    errors
  );
  assert(
    runRequest.activeRefs?.latestArtifactId === deliveryArtifact.id,
    "run request latestArtifactId must reference generated answer artifact",
    errors
  );
  assert(
    fulfillment.requestId === runRequest.id &&
      fulfillment.status === "delivered",
    "fulfillment must deliver on the run request",
    errors
  );
  assert(
    fulfillment.artifactIds.includes(deliveryArtifact.id),
    "fulfillment must include generated answer artifact",
    errors
  );
  assert(
    deliveryArtifact.requestId === runRequest.id &&
      deliveryArtifact.fulfillmentId === fulfillment.id,
    "generated answer artifact must attach to run request fulfillment",
    errors
  );
  assert(
    idempotency.sameKeyReturnsRunRequestId === runRequest.id &&
      idempotency.sameKeyLedgerEntryId === ledgerEntry.id,
    "same idempotency key must resolve to same run request and ledger entry",
    errors
  );
  assert(
    negativeCases.privateChatReadByNonOwner.expectedStatus === 403,
    "private non-owner analysis should be forbidden",
    errors
  );
  assert(
    negativeCases.assistantMessageReuse.expectedStatus === 400,
    "assistant message reuse should be rejected",
    errors
  );
  assert(
    negativeCases.missingRequiredVariable.expectedStatus === 400 &&
      negativeCases.missingRequiredVariable.debitCreated === false,
    "missing required variable should fail before debit",
    errors
  );
}

const errors: string[] = [];
validateAnalyzer(errors);
validateFixture(errors);

if (errors.length > 0) {
  console.error("Reusable prompt contract validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Validated reusable prompt contract.");
