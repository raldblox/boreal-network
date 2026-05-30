function parseOutput(output) {
  if (typeof output === "object" && output !== null) {
    return output;
  }

  if (typeof output !== "string") {
    throw new Error("Provider output was not a string or object.");
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Provider output was not valid JSON: ${error.message}`);
  }
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function outputSearchText(payload) {
  return normalizeText(
    [
      payload.assistantText,
      payload.rawText,
      JSON.stringify(payload.toolCalls ?? []),
    ].join("\n")
  );
}

function pass(score, reason) {
  return { pass: true, score, reason };
}

function fail(reason) {
  return { pass: false, score: 0, reason };
}

module.exports.routeOk = (output) => {
  const payload = parseOutput(output);

  if (payload.ok === true && payload.status >= 200 && payload.status < 300) {
    return pass(1, `Route returned ${payload.status}.`);
  }

  return fail(
    `Expected route success, got status ${payload.status}: ${
      payload.error || payload.rawText || "no response detail"
    }`
  );
};

module.exports.mentionsAll = (output, context) => {
  const payload = parseOutput(output);
  const text = outputSearchText(payload);
  const required = context.config?.all ?? [];
  const missing = required.filter((term) => !text.includes(normalizeText(term)));

  if (missing.length === 0) {
    return pass(1, `Found required terms: ${required.join(", ")}`);
  }

  return fail(`Missing required terms: ${missing.join(", ")}`);
};

module.exports.mentionsAny = (output, context) => {
  const payload = parseOutput(output);
  const text = outputSearchText(payload);
  const options = context.config?.any ?? [];
  const matched = options.filter((term) => text.includes(normalizeText(term)));

  if (matched.length > 0) {
    return pass(1, `Matched terms: ${matched.join(", ")}`);
  }

  return fail(`Expected at least one of: ${options.join(", ")}`);
};

module.exports.forbidsTerms = (output, context) => {
  const payload = parseOutput(output);
  const text = outputSearchText(payload);
  const forbidden = context.config?.terms ?? [];
  const found = forbidden.filter((term) => text.includes(normalizeText(term)));

  if (found.length === 0) {
    return pass(1, "No forbidden terms found.");
  }

  return fail(`Found forbidden terms: ${found.join(", ")}`);
};

module.exports.hasTool = (output, context) => {
  const payload = parseOutput(output);
  const expected = context.config?.tool;
  const tools = payload.tools ?? [];

  if (expected && tools.includes(expected)) {
    return pass(1, `Tool was called: ${expected}`);
  }

  return fail(`Expected tool ${expected}, got: ${tools.join(", ") || "none"}`);
};

module.exports.noTool = (output, context) => {
  const payload = parseOutput(output);
  const forbidden = context.config?.tool;
  const tools = payload.tools ?? [];
  const found = forbidden ? tools.includes(forbidden) : tools.length > 0;

  if (!found) {
    return pass(1, forbidden ? `${forbidden} was not called.` : "No tools called.");
  }

  return fail(
    forbidden
      ? `Forbidden tool was called: ${forbidden}`
      : `Expected no tools, got: ${tools.join(", ")}`
  );
};

module.exports.textOrTool = (output, context) => {
  const payload = parseOutput(output);
  const text = outputSearchText(payload);
  const tools = payload.tools ?? [];
  const anyText = context.config?.anyText ?? [];
  const anyTool = context.config?.anyTool ?? [];
  const matchedText = anyText.filter((term) => text.includes(normalizeText(term)));
  const matchedTool = anyTool.filter((tool) => tools.includes(tool));

  if (matchedText.length > 0 || matchedTool.length > 0) {
    return pass(
      1,
      `Matched text ${matchedText.join(", ") || "none"} or tool ${
        matchedTool.join(", ") || "none"
      }.`
    );
  }

  return fail(
    `Expected text ${anyText.join(", ")} or tool ${anyTool.join(", ")}.`
  );
};
