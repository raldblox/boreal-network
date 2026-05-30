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
    errors.push("missing required variable should throw before chat fork");
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
    idempotency,
    ledgerEntry,
    negativeCases,
    quota,
    runAssistantMessage,
    runChat,
    runUserMessage,
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
  assert(runChat.id !== sourceChat.id, "run chat must be distinct", errors);
  assert(runChat.visibility === "private", "run chat must be private", errors);
  assert(
    runChat.requestCreated === false,
    "reusable prompt run must not create a Request in V1",
    errors
  );

  const provenance = runUserMessage.provenance;
  assert(
    provenance?.profile === "public_chat_prompt_reuse_v0",
    "run user message must carry reusable prompt profile",
    errors
  );
  assert(
    provenance?.billingMode === "free_chat",
    "reusable prompt run must be a free chat fork",
    errors
  );
  assert(
    provenance?.sourceChatId === sourceChat.id,
    "provenance must reference source chat id",
    errors
  );
  assert(
    provenance?.sourceMessageId === sourceMessage.id,
    "provenance must reference source message id",
    errors
  );
  assert(
    provenance?.sourceUserId === sourceChat.userId,
    "provenance must reference original sharer",
    errors
  );
  assert(
    provenance?.templateText === analysis.templateText,
    "provenance must store template text",
    errors
  );
  assert(
    provenance?.inputValues?.date_of_birth === "01/01/2001",
    "provenance must store input values",
    errors
  );
  assert(
    provenance?.renderedPrompt === runUserMessage.text,
    "run user message must contain the filled prompt",
    errors
  );
  assert(
    provenance?.runChatId === runChat.id &&
      provenance?.runUserMessageId === runUserMessage.id,
    "provenance must link the forked chat and user message",
    errors
  );
  assert(
    runAssistantMessage.chatId === runChat.id &&
      runAssistantMessage.role === "assistant",
    "assistant answer must belong to the forked private chat",
    errors
  );
  assert(
    transaction === null && ledgerEntry === null,
    "free reusable prompt chat fork must not create transaction or ledger truth",
    errors
  );
  assert(
    quota.costLabel === "FREE" && quota.amount === "0.00",
    "run cost should be visibly free",
    errors
  );
  assert(
    quota.defaultDailyChatLimit === 10 && quota.topUpDailyChatLimit === 20,
    "quota should default to 10 chats and 20 after any top-up",
    errors
  );
  assert(
    provenance?.freeRunPolicy?.dailyChatLimit === 10 &&
      provenance?.freeRunPolicy?.topUpEligible === false,
    "provenance should snapshot daily quota policy",
    errors
  );
  assert(
    typeof provenance?.estimatedInputTokens === "number" &&
      typeof provenance?.estimatedRunTokens === "number",
    "provenance should snapshot estimated token usage",
    errors
  );
  assert(
    idempotency.sameKeyReturnsRunChatId === runChat.id &&
      idempotency.sameKeyDoesNotCreateDuplicateChat === true,
    "same idempotency key must resolve to same forked chat",
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
      negativeCases.missingRequiredVariable.chatCreated === false &&
      negativeCases.missingRequiredVariable.debitCreated === false,
    "missing required variable should fail before chat fork or debit",
    errors
  );
  assert(
    negativeCases.dailyChatLimitReached.chatCreated === false &&
      negativeCases.dailyTokenLimitReached.chatCreated === false,
    "quota failures should happen before chat creation",
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
