const DEFAULT_BOREAL_WEB_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_PUBLIC_REQUEST_LIMIT = 20;

function normalizeBaseUrl(rawBaseUrl) {
  const trimmed = rawBaseUrl.trim();

  if (trimmed.length === 0) {
    return DEFAULT_BOREAL_WEB_BASE_URL;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error(
      "BOREAL_DESKTOP_WEB_BASE_URL is invalid. Use a full URL such as http://127.0.0.1:3000.",
    );
  }
}

export function getBorealWebBaseUrl() {
  return normalizeBaseUrl(
    process.env.BOREAL_DESKTOP_WEB_BASE_URL ?? DEFAULT_BOREAL_WEB_BASE_URL,
  );
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );
}

function sanitizePublicRequestEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const brief =
    entry.brief && typeof entry.brief === "object" ? entry.brief : {};
  const seeking =
    entry.seeking && typeof entry.seeking === "object" ? entry.seeking : {};
  const budget =
    entry.budget && typeof entry.budget === "object" ? entry.budget : null;
  const deadline =
    entry.deadline && typeof entry.deadline === "object" ? entry.deadline : null;
  const activeRefs =
    entry.activeRefs && typeof entry.activeRefs === "object"
      ? entry.activeRefs
      : {};
  const latest =
    entry.latest && typeof entry.latest === "object" ? entry.latest : {};
  const derived =
    entry.derived && typeof entry.derived === "object" ? entry.derived : {};
  const readiness =
    derived.readiness && typeof derived.readiness === "object"
      ? derived.readiness
      : {};

  return {
    activeRefs: {
      activeCommitmentId:
        typeof activeRefs.activeCommitmentId === "string"
          ? activeRefs.activeCommitmentId
          : null,
      activeFulfillmentId:
        typeof activeRefs.activeFulfillmentId === "string"
          ? activeRefs.activeFulfillmentId
          : null,
      latestArtifactId:
        typeof activeRefs.latestArtifactId === "string"
          ? activeRefs.latestArtifactId
          : null,
      latestTransactionId:
        typeof activeRefs.latestTransactionId === "string"
          ? activeRefs.latestTransactionId
          : null,
    },
    brief: {
      body: typeof brief.body === "string" ? brief.body : "",
      constraints:
        brief.constraints && typeof brief.constraints === "object"
          ? brief.constraints
          : {},
      outputKinds: sanitizeStringArray(brief.outputKinds),
      summary: typeof brief.summary === "string" ? brief.summary : "",
      tags: sanitizeStringArray(brief.tags),
      title: typeof brief.title === "string" ? brief.title : "",
    },
    budget: budget
      ? {
          currency:
            typeof budget.currency === "string" ? budget.currency : null,
          fixedAmount:
            typeof budget.fixedAmount === "number" ? budget.fixedAmount : null,
          maxAmount:
            typeof budget.maxAmount === "number" ? budget.maxAmount : null,
          minAmount:
            typeof budget.minAmount === "number" ? budget.minAmount : null,
          mode: typeof budget.mode === "string" ? budget.mode : "open",
        }
      : null,
    createdAt:
      typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    deadline: deadline
      ? {
          notes: typeof deadline.notes === "string" ? deadline.notes : "",
          targetAt:
            typeof deadline.targetAt === "string" ? deadline.targetAt : null,
        }
      : null,
    derived: {
      executionKind:
        typeof derived.executionKind === "string" ? derived.executionKind : null,
      matchingMode:
        typeof derived.matchingMode === "string" ? derived.matchingMode : null,
      missingDetails: sanitizeStringArray(derived.missingDetails),
      paymentMode:
        typeof derived.paymentMode === "string" ? derived.paymentMode : null,
      readiness: {
        readyForMatch: readiness.readyForMatch === true,
        readyForOpen: readiness.readyForOpen === true,
        state: typeof readiness.state === "string" ? readiness.state : "ready_to_match",
        summary:
          typeof readiness.summary === "string"
            ? readiness.summary
            : "Open public request.",
      },
      routeFamily:
        typeof derived.routeFamily === "string" ? derived.routeFamily : null,
      routeSummary:
        typeof derived.routeSummary === "string" ? derived.routeSummary : null,
    },
    id: typeof entry.id === "string" ? entry.id : "",
    key: typeof entry.key === "string" ? entry.key : "",
    latest: {
      summary: typeof latest.summary === "string" ? latest.summary : "",
    },
    seeking: {
      actorKinds: sanitizeStringArray(seeking.actorKinds),
      notes: typeof seeking.notes === "string" ? seeking.notes : "",
      supplyKinds: sanitizeStringArray(seeking.supplyKinds),
      teamMode: typeof seeking.teamMode === "string" ? seeking.teamMode : "",
    },
    status: typeof entry.status === "string" ? entry.status : "open",
    updatedAt:
      typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
    visibility: "public",
  };
}

function buildPublicRequestsUrl({ limit, startingAfter, endingBefore }) {
  const url = new URL("/api/requests", getBorealWebBaseUrl());
  url.searchParams.set("scope", "public");
  url.searchParams.set("limit", String(limit));

  if (typeof startingAfter === "string" && startingAfter.trim().length > 0) {
    url.searchParams.set("starting_after", startingAfter);
  }

  if (typeof endingBefore === "string" && endingBefore.trim().length > 0) {
    url.searchParams.set("ending_before", endingBefore);
  }

  return url;
}

function extractHtmlErrorMessage(payload) {
  const nextDataMatch = payload.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i,
  );

  if (!nextDataMatch) {
    return "Boreal web returned an HTML error page.";
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const rawMessage =
      typeof nextData?.err?.message === "string" ? nextData.err.message : "";
    const firstLine = rawMessage.split("\n").find((line) => line.trim().length > 0);

    return firstLine?.trim() || "Boreal web returned a development error page.";
  } catch {
    return "Boreal web returned a development error page.";
  }
}

export async function listPublicRequests(options = {}) {
  const limit = Math.min(
    Math.max(
      Number.isFinite(options.limit)
        ? Number(options.limit)
        : DEFAULT_PUBLIC_REQUEST_LIMIT,
      1,
    ),
    50,
  );
  const url = buildPublicRequestsUrl({
    endingBefore: options.endingBefore,
    limit,
    startingAfter: options.startingAfter,
  });

  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error(
      `Public requests unavailable. Start Boreal web at ${getBorealWebBaseUrl()} or set BOREAL_DESKTOP_WEB_BASE_URL.`,
    );
  }

  if (!response.ok) {
    let detail = "";

    try {
      detail = (await response.text()).trim();
    } catch {
      detail = "";
    }

    if (detail.startsWith("<!DOCTYPE html>")) {
      throw new Error(`Public requests failed: ${extractHtmlErrorMessage(detail)}`);
    }

    throw new Error(
      detail
        ? `Public requests failed: ${detail}`
        : `Public requests failed with ${response.status}.`,
    );
  }

  const payload = await response.json();
  const requests = Array.isArray(payload?.requests)
    ? payload.requests.map(sanitizePublicRequestEntry).filter(Boolean)
    : [];

  return {
    fetchedAt: new Date().toISOString(),
    hasMore: payload?.hasMore === true,
    requests,
    sourceBaseUrl: getBorealWebBaseUrl(),
  };
}
