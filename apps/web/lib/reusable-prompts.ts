export const REUSABLE_PROMPT_PROFILE = "public_chat_prompt_reuse_v0" as const;

export type ReusablePromptFieldType = "text" | "date" | "number";

export type ReusablePromptField = {
  key: string;
  label: string;
  type: ReusablePromptFieldType;
  required: boolean;
  token: string;
  example?: string;
};

export type ReusablePromptAnalysis = {
  profile: typeof REUSABLE_PROMPT_PROFILE;
  sourceText: string;
  templateText: string;
  fields: ReusablePromptField[];
  warnings: string[];
};

export type ReusablePromptInputValues = Record<string, string>;

const TOKEN_PATTERN =
  /\{\{\s*([A-Za-z0-9_. -]{1,80})\s*\}\}|\{\s*([A-Za-z0-9_. -]{1,80})\s*\}|\[([^\]\n]{1,160})\]/g;

const DATE_VALUE_PATTERN =
  /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i;

function normalizeFieldKey(value: string) {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "input";
}

function fieldLabelFromKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function inferBracketField({
  index,
  sourceText,
  value,
}: {
  index: number;
  sourceText: string;
  value: string;
}) {
  const before = sourceText.slice(Math.max(0, index - 120), index);
  const after = sourceText.slice(index, Math.min(sourceText.length, index + 80));
  const context = `${before} ${after}`.toLowerCase();
  const looksLikeDate = DATE_VALUE_PATTERN.test(value.trim());

  if (
    /\bdate of birth\b|\bbirth date\b|\bbirthday\b|\bdob\b/.test(context)
  ) {
    return {
      key: "date_of_birth",
      label: "Date of birth",
      type: "date" as const,
    };
  }

  if (/\bborn\b|\bbirth\b/.test(context) && looksLikeDate) {
    return {
      key: "date_of_birth",
      label: "Date of birth",
      type: "date" as const,
    };
  }

  if (looksLikeDate) {
    return {
      key: "date",
      label: "Date",
      type: "date" as const,
    };
  }

  return {
    key: "input",
    label: "Input",
    type: "text" as const,
  };
}

function reserveFieldKey({
  baseKey,
  example,
  fieldsByKey,
  token,
}: {
  baseKey: string;
  example?: string;
  fieldsByKey: Map<string, ReusablePromptField>;
  token: string;
}) {
  const existing = fieldsByKey.get(baseKey);
  if (!existing) {
    return baseKey;
  }

  if (existing.token === token || existing.example === example) {
    return baseKey;
  }

  let suffix = 2;
  let candidate = `${baseKey}_${suffix}`;
  while (fieldsByKey.has(candidate)) {
    suffix += 1;
    candidate = `${baseKey}_${suffix}`;
  }

  return candidate;
}

export function analyzeReusablePromptText(
  sourceText: string
): ReusablePromptAnalysis {
  const normalizedSourceText = sourceText.trim();
  const fields: ReusablePromptField[] = [];
  const fieldsByKey = new Map<string, ReusablePromptField>();
  const warnings: string[] = [];
  let cursor = 0;
  let templateText = "";
  let bracketFallbackCount = 0;

  for (const match of normalizedSourceText.matchAll(TOKEN_PATTERN)) {
    const token = match[0];
    const index = match.index ?? 0;
    const explicitKey = match[1] ?? match[2];
    const bracketValue = match[3];

    templateText += normalizedSourceText.slice(cursor, index);

    let baseKey: string;
    let label: string;
    let type: ReusablePromptFieldType;
    let example: string | undefined;

    if (explicitKey) {
      baseKey = normalizeFieldKey(explicitKey);
      label = fieldLabelFromKey(baseKey);
      type = baseKey.includes("date") ? "date" : "text";
    } else {
      const inferred = inferBracketField({
        index,
        sourceText: normalizedSourceText,
        value: bracketValue,
      });
      baseKey = normalizeFieldKey(inferred.key);
      label = inferred.label;
      type = inferred.type;
      example = bracketValue.trim();

      if (baseKey === "input") {
        bracketFallbackCount += 1;
        baseKey = `input_${bracketFallbackCount}`;
        label = `Input ${bracketFallbackCount}`;
        warnings.push(
          `Bracket value "${example}" was detected as ${baseKey} because no nearby semantic label was found.`
        );
      }
    }

    const key = reserveFieldKey({
      baseKey,
      example,
      fieldsByKey,
      token,
    });

    if (!fieldsByKey.has(key)) {
      const field = {
        key,
        label: key === baseKey ? label : fieldLabelFromKey(key),
        type,
        required: true,
        token,
        ...(example ? { example } : {}),
      } satisfies ReusablePromptField;

      fields.push(field);
      fieldsByKey.set(key, field);
    }

    templateText += `{{${key}}}`;
    cursor = index + token.length;
  }

  templateText += normalizedSourceText.slice(cursor);

  if (fields.length === 0) {
    warnings.push(
      "No reusable input variables detected. The run will reuse the prompt text as-is."
    );
    templateText = normalizedSourceText;
  }

  return {
    profile: REUSABLE_PROMPT_PROFILE,
    sourceText: normalizedSourceText,
    templateText,
    fields,
    warnings,
  };
}

export function validateReusablePromptInputValues({
  fields,
  inputValues,
}: {
  fields: ReusablePromptField[];
  inputValues: ReusablePromptInputValues;
}) {
  return fields
    .filter((field) => field.required)
    .map((field) => field.key)
    .filter((key) => !inputValues[key]?.trim());
}

export function renderReusablePrompt({
  fields,
  inputValues,
  templateText,
}: {
  fields: ReusablePromptField[];
  inputValues: ReusablePromptInputValues;
  templateText: string;
}) {
  const missingFields = validateReusablePromptInputValues({
    fields,
    inputValues,
  });

  if (missingFields.length > 0) {
    throw new Error(
      `Missing reusable prompt input: ${missingFields.join(", ")}`
    );
  }

  return fields.reduce((renderedPrompt, field) => {
    const value = inputValues[field.key]?.trim() ?? "";
    return renderedPrompt.replaceAll(`{{${field.key}}}`, value);
  }, templateText);
}
