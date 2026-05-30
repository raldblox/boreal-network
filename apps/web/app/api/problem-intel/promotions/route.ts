import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeProblemIntelPromotion } from "@/lib/problem-intel";

const promotionRequestSchema = z.object({
  problemId: z.string().trim().min(1),
  status: z.enum(["backlog", "testing", "validated", "shipped", "rejected"]),
  owner: z.string().trim().min(1).max(120).default("local-owner"),
  rationale: z.string().trim().max(1000).optional(),
});

function canEdit(request: Request) {
  const configuredToken = process.env.PROBLEM_INTEL_EDIT_TOKEN?.trim();
  const providedToken = request.headers
    .get("x-problem-intel-edit-token")
    ?.trim();

  // Problem-intel writes are repo-local filesystem mutations. Do not reopen
  // them just because a staging or demo server is not running NODE_ENV=production.
  if (!configuredToken || !providedToken) {
    return false;
  }

  const expected = Buffer.from(configuredToken, "utf8");
  const provided = Buffer.from(providedToken, "utf8");

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

export async function POST(request: Request) {
  if (!canEdit(request)) {
    return NextResponse.json(
      {
        error: "Problem-intel promotion is disabled in this environment.",
      },
      { status: 403 }
    );
  }

  let body: z.infer<typeof promotionRequestSchema>;

  try {
    body = promotionRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        error: "Invalid promotion payload.",
      },
      { status: 400 }
    );
  }

  try {
    const result = writeProblemIntelPromotion(body);

    return NextResponse.json({
      promotion: result.record,
      requestTemplate: result.requestTemplate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to write problem-intel promotion.",
      },
      { status: 400 }
    );
  }
}
