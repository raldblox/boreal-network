export const defaultRequestActivityLimit = 40;
export const maxRequestActivityLimit = 100;

export type RequestActivityCursorInput = {
  afterSequence?: number;
  limit: number;
};

export type RequestActivityCursor = {
  afterSequence: number | null;
  hasMoreNewer: boolean;
  latestSequence: number | null;
  limit: number;
  nextAfterSequence: number | null;
  order: "newest_first" | "replay";
  returned: number;
};

export type RequestActivityCursorParseResult =
  | {
      ok: true;
      value: RequestActivityCursorInput;
    }
  | {
      message: string;
      ok: false;
    };

export function parseRequestActivityCursor(
  searchParams: URLSearchParams
): RequestActivityCursorParseResult {
  const limitText = searchParams.get("limit");
  const afterSequenceText = searchParams.get("after_sequence");
  const limit = limitText
    ? Number.parseInt(limitText, 10)
    : defaultRequestActivityLimit;

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > maxRequestActivityLimit ||
    String(limit) !== (limitText ?? String(limit))
  ) {
    return {
      message: `limit must be an integer from 1 to ${maxRequestActivityLimit}.`,
      ok: false,
    };
  }

  if (!afterSequenceText) {
    return {
      ok: true,
      value: { limit },
    };
  }

  const afterSequence = Number.parseInt(afterSequenceText, 10);
  if (
    !Number.isSafeInteger(afterSequence) ||
    afterSequence < 0 ||
    String(afterSequence) !== afterSequenceText
  ) {
    return {
      message: "after_sequence must be a non-negative integer.",
      ok: false,
    };
  }

  return {
    ok: true,
    value: {
      afterSequence,
      limit,
    },
  };
}

export function buildRequestActivityCursor({
  activity,
  afterSequence,
  fetchedCount,
  limit,
}: {
  activity: readonly { sequence: number }[];
  afterSequence?: number;
  fetchedCount: number;
  limit: number;
}): RequestActivityCursor {
  const latestSequence =
    activity.length > 0
      ? Math.max(...activity.map((entry) => entry.sequence))
      : (afterSequence ?? null);

  return {
    afterSequence: afterSequence ?? null,
    hasMoreNewer: afterSequence !== undefined && fetchedCount > limit,
    latestSequence,
    limit,
    nextAfterSequence: latestSequence,
    order: afterSequence === undefined ? "newest_first" : "replay",
    returned: activity.length,
  };
}
