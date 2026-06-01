export type RequestPreflightPreviewMessage = {
  role: string;
  parts?: Array<{
    text?: string;
    type?: string;
  }>;
};

export type RequestPreflightPreview = {
  budget: string | null;
  capturedAsk: string | null;
  deadline: string | null;
  doneCondition: string | null;
  humanOrLocalNeeds: string[];
  knownConstraints: string[];
  missingEssentials: string[];
  nextQuestion: string | null;
  proofNeeds: string[];
  readyToDraft: boolean;
};

const MAX_PREVIEW_TEXT_LENGTH = 180;

export function buildRequestPreflightPreview(
  messages: RequestPreflightPreviewMessage[]
): RequestPreflightPreview {
  const userTexts = messages
    .filter((message) => message.role === "user")
    .map(getRequestPreflightMessageText)
    .filter((text) => text.length > 0);
  const assistantTexts = messages
    .filter((message) => message.role === "assistant")
    .map(getRequestPreflightMessageText)
    .filter((text) => text.length > 0);
  const combinedUserText = userTexts.join("\n");
  const capturedAsk = compactPreviewText(userTexts[0] ?? "");
  const doneCondition = extractDoneCondition(combinedUserText, capturedAsk);
  const budget = extractBudget(combinedUserText);
  const deadline = extractDeadline(combinedUserText);
  const knownConstraints = extractKnownConstraints(combinedUserText);
  const proofNeeds = extractProofNeeds(combinedUserText);
  const humanOrLocalNeeds = extractHumanOrLocalNeeds(combinedUserText);
  const nextQuestion = extractNextQuestion(assistantTexts);
  const missingEssentials = getMissingEssentials({
    capturedAsk,
    doneCondition,
    humanOrLocalNeeds,
    proofNeeds,
    sourceText: combinedUserText,
  });

  return {
    budget,
    capturedAsk,
    deadline,
    doneCondition,
    humanOrLocalNeeds,
    knownConstraints,
    missingEssentials,
    nextQuestion,
    proofNeeds,
    readyToDraft: Boolean(capturedAsk && missingEssentials.length === 0),
  };
}

export function getRequestPreflightMessageText(
  message: RequestPreflightPreviewMessage
) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function compactPreviewText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_PREVIEW_TEXT_LENGTH) {
    return normalized || null;
  }

  return `${normalized.slice(0, MAX_PREVIEW_TEXT_LENGTH - 1).trim()}...`;
}

function extractDoneCondition(text: string, capturedAsk: string | null) {
  const doneMatch = text.match(
    /\b(?:done|complete|completed|finished|success|accepted|deliver(?:y|able)?|output|result)\b[^.!?\n]*(?:[.!?]|$)/i
  );

  if (doneMatch?.[0]) {
    return compactPreviewText(doneMatch[0]);
  }

  if (
    capturedAsk &&
    /\b(?:create|make|build|write|review|audit|find|explain|summarize|generate|book|buy|design|fix|install|inspect)\b/i.test(
      capturedAsk
    )
  ) {
    return "The requested outcome is delivered and reviewable.";
  }

  return null;
}

function extractBudget(text: string) {
  const budgetMatch = text.match(
    /(?:budget|under|less than|up to|around|about|between|from)\s+[^.!?\n]*(?:\$|usd|php|eur|gbp|credits?)?[^.!?\n]*(?:[.!?]|$)|(?:\$|usd|php|eur|gbp)\s?\d[\d,]*(?:\.\d+)?/i
  );

  return budgetMatch?.[0] ? compactPreviewText(budgetMatch[0]) : null;
}

function extractDeadline(text: string) {
  const deadlineMatch = text.match(
    /\b(?:deadline|due|by|before|today|tomorrow|tonight|this week|next week|friday|monday|tuesday|wednesday|thursday|saturday|sunday|in \d+ (?:hours?|days?|weeks?))\b[^.!?\n]*(?:[.!?]|$)/i
  );

  return deadlineMatch?.[0] ? compactPreviewText(deadlineMatch[0]) : null;
}

function extractKnownConstraints(text: string) {
  const constraints: string[] = [];

  if (/\b(?:location|address|onsite|on-site|in person|pickup|dropoff|visit|field|inspect|inspection)\b/i.test(text)) {
    constraints.push("Location or access may matter");
  }

  if (/\b(?:safety|permission|access|credential|login|keys?|private|sensitive)\b/i.test(text)) {
    constraints.push("Access or safety constraints mentioned");
  }

  if (/\b(?:style|format|tone|brand|template|pdf|video|image|report|spreadsheet)\b/i.test(text)) {
    constraints.push("Output format or style mentioned");
  }

  return constraints;
}

function extractProofNeeds(text: string) {
  const proofNeeds: string[] = [];

  if (/\b(?:proof|evidence|verify|verification|receipt|screenshot|photo|video|signature|witness|review)\b/i.test(text)) {
    proofNeeds.push("Proof or review expected");
  }

  if (/\b(?:deliverable|file|artifact|attachment|link|report|video|image|pdf)\b/i.test(text)) {
    proofNeeds.push("Deliverable artifact expected");
  }

  return proofNeeds;
}

function extractHumanOrLocalNeeds(text: string) {
  const needs: string[] = [];

  if (/\b(?:human|expert|reviewer|designer|lawyer|doctor|technician|courier|driver)\b/i.test(text)) {
    needs.push("Human capability may be needed");
  }

  if (/\b(?:onsite|on-site|in person|site visit|field inspection|inspect|inspection|pickup|dropoff|handoff|install|measure|local)\b/i.test(text)) {
    needs.push("Local or physical execution may be needed");
  }

  return needs;
}

function extractNextQuestion(assistantTexts: string[]) {
  for (const text of [...assistantTexts].reverse()) {
    const question = text
      .split(/(?<=[?])\s+/)
      .reverse()
      .find((sentence) => sentence.includes("?"));

    if (question) {
      return compactPreviewText(question);
    }
  }

  return null;
}

function getMissingEssentials({
  capturedAsk,
  doneCondition,
  humanOrLocalNeeds,
  proofNeeds,
  sourceText,
}: Pick<
  RequestPreflightPreview,
  | "capturedAsk"
  | "doneCondition"
  | "humanOrLocalNeeds"
  | "proofNeeds"
> & {
  sourceText: string;
}) {
  const missing: string[] = [];

  if (!capturedAsk) {
    missing.push("Ask");
  }

  if (!doneCondition) {
    missing.push("Done condition");
  }

  if (proofNeeds.length === 0) {
    missing.push("Proof or acceptance");
  }

  if (humanOrLocalNeeds.length > 0 && !hasLocationOrAccessDetail(sourceText)) {
    missing.push("Location or access");
  }

  return missing;
}

function hasLocationOrAccessDetail(text: string) {
  if (
    /\b(?:address|location|located|service location|site is)\s*(?::|is|at|in)?\s+\S+/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /\b(?:in|near|around|at)\s+[A-Z][A-Za-z0-9.'-]+(?:\s+[A-Z][A-Za-z0-9.'-]+){0,4}\b/.test(
      text
    )
  ) {
    return true;
  }

  return /\b(?:permission|gate code|keys?|credential|access window|login)\b/i.test(
    text
  );
}
