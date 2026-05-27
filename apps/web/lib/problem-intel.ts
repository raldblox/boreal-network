import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const problemIntelEvidenceSchema = z.object({
  sourceLabel: z.string(),
  excerpt: z.string(),
  observedAt: z.string(),
  url: z.string().url().optional(),
});

const problemIntelProblemSchema = z.object({
  problemId: z.string(),
  clusterId: z.string(),
  canonicalTitle: z.string(),
  problemStatement: z.string(),
  audience: z.string(),
  mentionCount: z.number().int().nonnegative().default(0),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  evidence: z.array(problemIntelEvidenceSchema).default([]),
  controlledTags: z.record(z.array(z.string())).default({}),
  openTags: z.array(z.string()).default([]),
  tagAliases: z.array(z.string()).default([]),
  scores: z.object({
    frequencyScore: z.number().min(0).max(1),
    urgencyScore: z.number().min(0).max(1),
    painSeverityScore: z.number().min(0).max(1),
    willingnessToPayScore: z.number().min(0).max(1),
    automationFitScore: z.number().min(0).max(1),
    borealFitScore: z.number().min(0).max(1),
  }),
  plannerOutput: z.object({
    routeHypothesis: z.string(),
    offerShape: z.string(),
    planSummary: z.string(),
    deliverables: z.array(z.string()).default([]),
    experiments: z.array(z.string()).default([]),
  }),
  judgeOutput: z.object({
    verdict: z.enum(["promising", "needs_revision", "reject"]),
    reasoning: z.string(),
    gaps: z.array(z.string()).default([]),
    confidenceScore: z.number().min(0).max(1),
  }),
  promotionRecommendation: z
    .enum(["hold", "promote_to_backlog", "promote_to_testing"])
    .optional(),
  requestTemplate: z
    .object({
      visibility: z.enum(["private", "public"]),
      brief: z.object({
        title: z.string(),
        summary: z.string().optional(),
        body: z.string(),
        outputKinds: z.array(z.string()).default([]),
        tags: z.array(z.string()).default([]),
      }),
      seeking: z
        .object({
          actorKinds: z.array(z.string()).default([]),
          supplyKinds: z.array(z.string()).default([]),
          teamMode: z.string().optional(),
          notes: z.string().optional(),
        })
        .optional(),
      budget: z
        .object({
          mode: z.enum(["quote", "fixed", "range", "open"]),
          notes: z.string().optional(),
        })
        .optional(),
      deadline: z
        .object({
          notes: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  planEvaluation: z
    .object({
      verdict: z.enum(["strong", "revise", "weak"]),
      requestRootednessScore: z.number().min(0).max(1),
      fulfillmentRealismScore: z.number().min(0).max(1),
      proofReadinessScore: z.number().min(0).max(1),
      wedgeFitScore: z.number().min(0).max(1),
      clarityScore: z.number().min(0).max(1),
      blockers: z.array(z.string()).default([]),
      rationale: z.string(),
    })
    .optional(),
});

const problemIntelClusterSchema = z.object({
  clusterId: z.string(),
  label: z.string(),
  rationale: z.string(),
  sharedTags: z.array(z.string()).default([]),
  problemIds: z.array(z.string()).default([]),
});

export const problemIntelPublicReportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  sourceRunId: z.string(),
  window: z.object({
    label: z.string(),
    from: z.string(),
    to: z.string(),
  }),
  summary: z.object({
    problemCount: z.number().int().nonnegative(),
    clusterCount: z.number().int().nonnegative(),
    reviewedProblemCount: z.number().int().nonnegative().optional(),
    notes: z.array(z.string()).default([]),
  }),
  clusters: z.array(problemIntelClusterSchema),
  problems: z.array(problemIntelProblemSchema),
});

export type ProblemIntelPublicReport = z.infer<
  typeof problemIntelPublicReportSchema
>;

export type ProblemIntelSource = {
  kind: "live" | "fallback";
  path: string;
};

const problemIntelProblemBundleSchema = z.object({
  schemaVersion: z.literal(1),
  problemId: z.string(),
  sourceRunId: z.string(),
  generatedAt: z.string(),
  problem: problemIntelProblemSchema,
});

export const problemIntelPromotionSchema = z.object({
  schemaVersion: z.literal(1),
  problemId: z.string(),
  status: z.enum(["backlog", "testing", "validated", "shipped", "rejected"]),
  owner: z.string(),
  rationale: z.string().optional(),
  promotedAt: z.string(),
  requestTemplatePath: z.string().optional(),
});

export type ProblemIntelPromotionRecord = z.infer<
  typeof problemIntelPromotionSchema
>;

export type ProblemIntelRequestTemplate = NonNullable<
  z.infer<typeof problemIntelProblemSchema>["requestTemplate"]
>;

export type ProblemIntelPlanEvaluation = NonNullable<
  z.infer<typeof problemIntelProblemSchema>["planEvaluation"]
>;

export type ProblemIntelPromotionRecommendation = NonNullable<
  z.infer<typeof problemIntelProblemSchema>["promotionRecommendation"]
>;

export type ProblemIntelProblem = z.infer<typeof problemIntelProblemSchema>;

export type ProblemIntelProblemView = ProblemIntelProblem & {
  promotionRecommendation: ProblemIntelPromotionRecommendation;
  requestTemplate: ProblemIntelRequestTemplate;
  planEvaluation: ProblemIntelPlanEvaluation;
  promotion: ProblemIntelPromotionRecord | null;
  storage: {
    kind: "problem_directory" | "report_snapshot";
    path: string;
  };
};

const problemIntelStopWords = new Set([
  "about",
  "across",
  "after",
  "already",
  "also",
  "among",
  "and",
  "another",
  "around",
  "because",
  "before",
  "being",
  "between",
  "cannot",
  "does",
  "done",
  "each",
  "even",
  "every",
  "from",
  "have",
  "into",
  "need",
  "needs",
  "only",
  "over",
  "same",
  "some",
  "still",
  "team",
  "teams",
  "that",
  "their",
  "them",
  "there",
  "they",
  "this",
  "those",
  "through",
  "under",
  "with",
  "without",
]);

export function loadProblemIntelReport(): {
  report: ProblemIntelPublicReport;
  source: ProblemIntelSource;
} {
  const roots = resolveRepoRoots();

  for (const root of roots) {
    const livePath = path.join(
      root,
      "tmp",
      "problem-intel",
      "published",
      "public-latest.json"
    );

    if (fs.existsSync(livePath)) {
      const rawReport = problemIntelPublicReportSchema.parse(readJson(livePath));
      return {
        report: normalizeProblemIntelReport(rawReport),
        source: {
          kind: "live",
          path: path.relative(root, livePath),
        },
      };
    }
  }

  for (const root of roots) {
    const fallbackPath = path.join(
      root,
      "fixtures",
      "problem-intel",
      "public-problem-intel.sample.json"
    );

    if (fs.existsSync(fallbackPath)) {
      const rawReport = problemIntelPublicReportSchema.parse(readJson(fallbackPath));
      return {
        report: normalizeProblemIntelReport(rawReport),
        source: {
          kind: "fallback",
          path: path.relative(root, fallbackPath),
        },
      };
    }
  }

  throw new Error("Could not resolve a problem-intel report source");
}

export function loadProblemIntelDashboard({
  persistProblemBundles = false,
}: {
  persistProblemBundles?: boolean;
} = {}): {
  report: ProblemIntelPublicReport;
  source: ProblemIntelSource;
  problems: ProblemIntelProblemView[];
} {
  const { report, source } = loadProblemIntelReport();

  if (persistProblemBundles) {
    ensureProblemIntelProblemDirectories(report);
  }

  const promotions = loadProblemIntelPromotions();
  const root = resolveRepoRoot();

  const problems = report.problems.map((problem) => {
    const bundle = loadProblemIntelProblemBundle(problem.problemId);

    return buildProblemIntelProblemView(
      bundle?.problem ?? problem,
      promotions.get(problem.problemId) ?? null,
      bundle
        ? {
            kind: "problem_directory",
            path: path.relative(root, bundle.path),
          }
        : {
            kind: "report_snapshot",
            path: source.path,
          }
    );
  });

  return {
    report,
    source,
    problems,
  };
}

export function loadProblemIntelPromotions() {
  const map = new Map<string, ProblemIntelPromotionRecord>();
  const promotionsDir = resolveProblemIntelPromotionsDir();

  if (!fs.existsSync(promotionsDir)) {
    return map;
  }

  for (const name of fs.readdirSync(promotionsDir)) {
    if (!name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(promotionsDir, name);
    const record = problemIntelPromotionSchema.parse(readJson(filePath));
    map.set(record.problemId, record);
  }

  return map;
}

export function findProblemIntelProblem(problemId: string) {
  const { report } = loadProblemIntelReport();
  return report.problems.find((problem) => problem.problemId === problemId) ?? null;
}

export function writeProblemIntelPromotion({
  problemId,
  status,
  owner,
  rationale,
}: {
  problemId: string;
  status: ProblemIntelPromotionRecord["status"];
  owner: string;
  rationale?: string;
}) {
  const problem = findProblemIntelProblem(problemId);

  if (!problem) {
    throw new Error(`Unknown problemId: ${problemId}`);
  }

  const root = resolveRepoRoot();
  const promotionsDir = path.join(root, "tmp", "problem-intel", "promotions");
  const requestDraftDir = path.join(promotionsDir, "request-drafts");
  fs.mkdirSync(requestDraftDir, { recursive: true });

  const requestTemplate = buildProblemIntelRequestTemplate(problem);
  const requestTemplatePath = path.join(requestDraftDir, `${problemId}.json`);
  fs.writeFileSync(
    requestTemplatePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        sourceProblemId: problem.problemId,
        sourceClusterId: problem.clusterId,
        requestTemplate,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const record: ProblemIntelPromotionRecord = {
    schemaVersion: 1,
    problemId,
    status,
    owner,
    rationale,
    promotedAt: new Date().toISOString(),
    requestTemplatePath: path.relative(root, requestTemplatePath),
  };

  const promotionPath = path.join(promotionsDir, `${problemId}.json`);
  fs.writeFileSync(promotionPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  return {
    record,
    requestTemplate,
  };
}

export function buildProblemIntelProblemView(
  problem: ProblemIntelProblem,
  promotion: ProblemIntelPromotionRecord | null,
  storage: ProblemIntelProblemView["storage"]
): ProblemIntelProblemView {
  const requestTemplate =
    problem.requestTemplate ?? buildProblemIntelRequestTemplate(problem);
  const planEvaluation =
    problem.planEvaluation ?? buildProblemIntelPlanEvaluation(problem);
  const promotionRecommendation =
    problem.promotionRecommendation ??
    buildProblemIntelPromotionRecommendation(problem, planEvaluation);

  return {
    ...problem,
    requestTemplate,
    planEvaluation,
    promotionRecommendation,
    promotion,
    storage,
  };
}

export function buildProblemIntelRequestTemplate(
  problem: ProblemIntelProblem
): ProblemIntelRequestTemplate {
  const workflowTags = problem.controlledTags.workflowTags ?? [];
  const proofTags = problem.controlledTags.proofTags ?? [];
  const actorKinds = inferActorKinds(problem);
  const supplyKinds = workflowTags.slice(0, 4);
  const deliverables = problem.plannerOutput.deliverables
    .map((item) => `- ${item}`)
    .join("\n");
  const painTags = problem.controlledTags.painTags ?? [];
  const urgencyTags = problem.controlledTags.urgencyTags ?? [];

  return {
    visibility: "private",
    brief: {
      title: problem.canonicalTitle,
      summary: problem.problemStatement,
      body: [
        `Need a serious completion lane for this problem: ${problem.problemStatement}`,
        "",
        `Target audience: ${problem.audience}.`,
        workflowTags.length > 0
          ? `Workflow focus: ${workflowTags.join(", ")}.`
          : null,
        deliverables ? `Expected deliverables:\n${deliverables}` : null,
        proofTags.length > 0
          ? `Proof requirements: ${proofTags.join(", ")}.`
          : null,
        painTags.length > 0 ? `Pain signals: ${painTags.join(", ")}.` : null,
        `Reason to open this request: convert a repeated public pain into a concrete fulfillment offer or pilot.`,
      ]
        .filter(Boolean)
        .join("\n"),
      outputKinds: problem.plannerOutput.deliverables.slice(0, 4),
      tags: [
        ...(workflowTags.slice(0, 4) ?? []),
        ...(urgencyTags.slice(0, 2) ?? []),
      ],
    },
    seeking: {
      actorKinds,
      supplyKinds,
      teamMode:
        actorKinds.includes("human") && actorKinds.includes("agent")
          ? "solo_or_team"
          : "solo",
      notes: `Derived from problem-intel cluster ${problem.clusterId}.`,
    },
    budget: {
      mode:
        problem.scores.willingnessToPayScore >= 0.82
          ? "range"
          : problem.scores.willingnessToPayScore >= 0.65
            ? "quote"
            : "open",
      notes: `Derived from willingnessToPayScore=${problem.scores.willingnessToPayScore.toFixed(
        2
      )}.`,
    },
    deadline: {
      notes:
        problem.scores.urgencyScore >= 0.85
          ? "Likely same-week request."
          : problem.scores.urgencyScore >= 0.7
            ? "Likely near-term request."
            : "Timing should be clarified with a real buyer.",
    },
  };
}

export function buildProblemIntelPlanEvaluation(
  problem: ProblemIntelProblem
): ProblemIntelPlanEvaluation {
  const proofTags = problem.controlledTags.proofTags ?? [];
  const clarityScore =
    Math.min(problem.evidence.length, 3) / 3 * 0.5 +
    Math.min(problem.plannerOutput.deliverables.length, 4) / 4 * 0.5;
  const fulfillmentRealismScore =
    (problem.scores.painSeverityScore +
      problem.scores.willingnessToPayScore +
      problem.judgeOutput.confidenceScore) /
    3;
  const proofReadinessScore = Math.min(1, proofTags.length / 3);

  return {
    verdict:
      problem.judgeOutput.verdict === "reject"
        ? "weak"
        : problem.judgeOutput.verdict === "needs_revision"
          ? "revise"
          : "strong",
    requestRootednessScore: problem.scores.borealFitScore,
    fulfillmentRealismScore,
    proofReadinessScore,
    wedgeFitScore: problem.scores.borealFitScore,
    clarityScore,
    blockers: problem.judgeOutput.gaps,
    rationale: problem.judgeOutput.reasoning,
  };
}

export function buildProblemIntelPromotionRecommendation(
  problem: ProblemIntelProblem,
  planEvaluation = buildProblemIntelPlanEvaluation(problem)
): ProblemIntelPromotionRecommendation {
  if (planEvaluation.verdict === "weak") {
    return "hold";
  }

  if (
    planEvaluation.verdict === "strong" &&
    problem.scores.borealFitScore >= 0.85 &&
    problem.scores.willingnessToPayScore >= 0.75
  ) {
    return "promote_to_testing";
  }

  return "promote_to_backlog";
}

export function normalizeProblemIntelReport(
  rawReport: ProblemIntelPublicReport
): ProblemIntelPublicReport {
  const historicalProblems = loadHistoricalProblemIntelProblems();
  const mergedProblems = new Map<string, ProblemIntelProblem>();
  const currentProblems: ProblemIntelProblem[] = [];

  for (const rawProblem of rawReport.problems) {
    const canonicalId =
      resolveCanonicalProblemId(rawProblem, currentProblems, historicalProblems) ??
      rawProblem.problemId;

    const normalizedProblem = withCanonicalProblemId(rawProblem, canonicalId);
    const existingProblem =
      mergedProblems.get(canonicalId) ?? historicalProblems.get(canonicalId) ?? null;

    const nextProblem = existingProblem
      ? mergeProblemIntelProblems(existingProblem, normalizedProblem)
      : normalizedProblem;

    mergedProblems.set(canonicalId, nextProblem);

    const existingIndex = currentProblems.findIndex(
      (problem) => problem.problemId === canonicalId
    );

    if (existingIndex >= 0) {
      currentProblems[existingIndex] = nextProblem;
    } else {
      currentProblems.push(nextProblem);
    }
  }

  const problems = [...mergedProblems.values()];
  const dedupedCount = Math.max(0, rawReport.problems.length - problems.length);
  const clusterIdsInUse = new Set(problems.map((problem) => problem.clusterId));
  const problemIdsInUse = new Set(problems.map((problem) => problem.problemId));
  const clusters = rawReport.clusters
    .map((cluster) => ({
      ...cluster,
      problemIds: uniqueStrings(
        cluster.problemIds
          .map((problemId) => {
            const directProblem = problems.find(
              (problem) => problem.problemId === problemId
            );

            if (directProblem) {
              return directProblem.problemId;
            }

            const matchedProblem = problems.find((problem) =>
              isProblemIntelDuplicate(
                problem,
                rawReport.problems.find((candidate) => candidate.problemId === problemId) ??
                  problem
              )
            );

            return matchedProblem?.problemId ?? null;
          })
          .filter((problemId): problemId is string => Boolean(problemId))
          .filter((problemId) => problemIdsInUse.has(problemId))
      ),
    }))
    .filter(
      (cluster) =>
        cluster.problemIds.length > 0 && clusterIdsInUse.has(cluster.clusterId)
    );

  const notes =
    dedupedCount > 0
      ? uniqueStrings([
          ...rawReport.summary.notes,
          `Canonicalized ${dedupedCount} repeated problem variant${dedupedCount === 1 ? "" : "s"} into existing problem directories.`,
        ])
      : rawReport.summary.notes;

  return {
    ...rawReport,
    summary: {
      ...rawReport.summary,
      problemCount: problems.length,
      clusterCount: clusters.length,
      reviewedProblemCount:
        rawReport.summary.reviewedProblemCount != null ? problems.length : undefined,
      notes,
    },
    clusters,
    problems,
  };
}

function resolveRepoRoots() {
  const cwd = path.join(/*turbopackIgnore: true*/ process.cwd());

  const candidates = [
    cwd,
    path.join(cwd, "..", ".."),
  ];

  return Array.from(new Set(candidates));
}

function resolveRepoRoot() {
  for (const candidate of resolveRepoRoots()) {
    if (fs.existsSync(path.join(candidate, "fixtures", "problem-intel"))) {
      return candidate;
    }
  }

  throw new Error("Could not resolve Boreal repo root for problem-intel");
}

function resolveProblemIntelPromotionsDir() {
  return path.join(resolveRepoRoot(), "tmp", "problem-intel", "promotions");
}

function resolveProblemIntelProblemsDir() {
  return path.join(resolveRepoRoot(), "tmp", "problem-intel", "problems");
}

function loadHistoricalProblemIntelProblems() {
  const problemsDir = resolveProblemIntelProblemsDir();
  const map = new Map<string, ProblemIntelProblem>();

  if (!fs.existsSync(problemsDir)) {
    return map;
  }

  for (const entry of fs.readdirSync(problemsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const latestPath = path.join(problemsDir, entry.name, "latest.json");

    if (!fs.existsSync(latestPath)) {
      continue;
    }

    const bundle = problemIntelProblemBundleSchema.parse(readJson(latestPath));

    if (bundle.sourceRunId.startsWith("sample-")) {
      continue;
    }

    map.set(bundle.problem.problemId, bundle.problem);
  }

  return map;
}

function loadProblemIntelProblemBundle(problemId: string) {
  const filePath = path.join(
    resolveProblemIntelProblemsDir(),
    problemId,
    "latest.json"
  );

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const bundle = problemIntelProblemBundleSchema.parse(readJson(filePath));

  return {
    problem: bundle.problem,
    path: filePath,
  };
}

function ensureProblemIntelProblemDirectories(report: ProblemIntelPublicReport) {
  const problemsDir = resolveProblemIntelProblemsDir();
  fs.mkdirSync(problemsDir, { recursive: true });

  for (const rawProblem of report.problems) {
    const problem = {
      ...rawProblem,
      requestTemplate:
        rawProblem.requestTemplate ?? buildProblemIntelRequestTemplate(rawProblem),
      planEvaluation:
        rawProblem.planEvaluation ?? buildProblemIntelPlanEvaluation(rawProblem),
      promotionRecommendation:
        rawProblem.promotionRecommendation ??
        buildProblemIntelPromotionRecommendation(rawProblem),
    } satisfies ProblemIntelProblem;

    const problemDir = path.join(problemsDir, problem.problemId);
    const historyDir = path.join(problemDir, "history");
    fs.mkdirSync(historyDir, { recursive: true });

    const bundle = {
      schemaVersion: 1 as const,
      problemId: problem.problemId,
      sourceRunId: report.sourceRunId,
      generatedAt: report.generatedAt,
      problem,
    };

    const latestPath = path.join(problemDir, "latest.json");
    fs.writeFileSync(latestPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

    const safeTimestamp = report.generatedAt.replace(/[:.]/g, "-");
    const historyPath = path.join(historyDir, `${safeTimestamp}.json`);

    if (!fs.existsSync(historyPath)) {
      fs.writeFileSync(historyPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    }
  }
}

function inferActorKinds(problem: ProblemIntelProblem) {
  const executionTags = problem.controlledTags.executionTags ?? [];
  const actorKinds = new Set<string>();

  if (
    executionTags.includes("human_lead_plus_ai_build") ||
    executionTags.includes("qa_and_evidence_lane")
  ) {
    actorKinds.add("human");
    actorKinds.add("agent");
  }

  if (executionTags.includes("human_only_service")) {
    actorKinds.add("human");
  }

  if (executionTags.includes("direct_tool_lane")) {
    actorKinds.add("tool");
  }

  if (actorKinds.size === 0) {
    actorKinds.add("human");
  }

  return [...actorKinds];
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function resolveCanonicalProblemId(
  problem: ProblemIntelProblem,
  currentProblems: ProblemIntelProblem[],
  historicalProblems: Map<string, ProblemIntelProblem>
) {
  const currentMatch = findBestProblemIntelMatch(problem, currentProblems);

  if (currentMatch) {
    return currentMatch.problemId;
  }

  const historicalMatch = findBestProblemIntelMatch(
    problem,
    [...historicalProblems.values()]
  );

  return historicalMatch?.problemId ?? null;
}

function findBestProblemIntelMatch(
  target: ProblemIntelProblem,
  candidates: ProblemIntelProblem[]
) {
  let bestMatch: { problemId: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreProblemIntelMatch(target, candidate);

    if (score < 0.62) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        problemId: candidate.problemId,
        score,
      };
    }
  }

  return bestMatch;
}

function scoreProblemIntelMatch(
  left: ProblemIntelProblem,
  right: ProblemIntelProblem
) {
  if (left.problemId === right.problemId) {
    return 1;
  }

  if (
    normalizeProblemIntelText(left.canonicalTitle) ===
    normalizeProblemIntelText(right.canonicalTitle)
  ) {
    return 0.96;
  }

  const leftAliases = getProblemIntelAliases(left);
  const rightAliases = getProblemIntelAliases(right);
  const hasAliasMatch = [...leftAliases].some((alias) => rightAliases.has(alias));
  const titleSimilarity = jaccardSimilarity(
    getProblemIntelTerms(left.canonicalTitle, ...left.tagAliases),
    getProblemIntelTerms(right.canonicalTitle, ...right.tagAliases)
  );
  const workflowSimilarity = jaccardSimilarity(
    getProblemIntelTagSet(left, "workflowTags"),
    getProblemIntelTagSet(right, "workflowTags")
  );
  const painSimilarity = jaccardSimilarity(
    getProblemIntelTagSet(left, "painTags"),
    getProblemIntelTagSet(right, "painTags")
  );
  const patternSimilarity = jaccardSimilarity(
    getProblemIntelTagSet(left, "patternTags"),
    getProblemIntelTagSet(right, "patternTags")
  );
  const audienceSimilarity = jaccardSimilarity(
    getProblemIntelTerms(left.audience),
    getProblemIntelTerms(right.audience)
  );

  const heuristicScore =
    workflowSimilarity * 0.4 +
    painSimilarity * 0.22 +
    patternSimilarity * 0.18 +
    titleSimilarity * 0.15 +
    audienceSimilarity * 0.05;

  if (hasAliasMatch && (workflowSimilarity >= 0.34 || painSimilarity >= 0.34)) {
    return Math.max(heuristicScore, 0.9);
  }

  return heuristicScore;
}

function isProblemIntelDuplicate(
  left: ProblemIntelProblem,
  right: ProblemIntelProblem
) {
  return scoreProblemIntelMatch(left, right) >= 0.62;
}

function withCanonicalProblemId(
  problem: ProblemIntelProblem,
  canonicalProblemId: string
): ProblemIntelProblem {
  if (problem.problemId === canonicalProblemId) {
    return problem;
  }

  return {
    ...problem,
    problemId: canonicalProblemId,
    tagAliases: uniqueStrings([
      ...problem.tagAliases,
      problem.problemId,
      problem.canonicalTitle,
    ]),
  };
}

function mergeProblemIntelProblems(
  base: ProblemIntelProblem,
  incoming: ProblemIntelProblem
): ProblemIntelProblem {
  const preferred = pickPreferredProblemIntelProblem(base, incoming);
  const fallback = preferred.problemId === base.problemId ? incoming : base;
  const evidence = mergeProblemIntelEvidence(base.evidence, incoming.evidence);

  return {
    ...preferred,
    firstSeenAt:
      new Date(base.firstSeenAt) <= new Date(incoming.firstSeenAt)
        ? base.firstSeenAt
        : incoming.firstSeenAt,
    lastSeenAt:
      new Date(base.lastSeenAt) >= new Date(incoming.lastSeenAt)
        ? base.lastSeenAt
        : incoming.lastSeenAt,
    mentionCount: Math.max(base.mentionCount, incoming.mentionCount, evidence.length),
    evidence,
    controlledTags: mergeProblemIntelControlledTags(
      base.controlledTags,
      incoming.controlledTags
    ),
    openTags: uniqueStrings([...base.openTags, ...incoming.openTags]),
    tagAliases: uniqueStrings([
      ...base.tagAliases,
      ...incoming.tagAliases,
      base.problemId,
      incoming.problemId,
      base.canonicalTitle,
      incoming.canonicalTitle,
    ]),
    promotionRecommendation:
      preferred.promotionRecommendation ?? fallback.promotionRecommendation,
    requestTemplate: preferred.requestTemplate ?? fallback.requestTemplate,
    planEvaluation: preferred.planEvaluation ?? fallback.planEvaluation,
  };
}

function pickPreferredProblemIntelProblem(
  left: ProblemIntelProblem,
  right: ProblemIntelProblem
) {
  const leftTimestamp = new Date(left.lastSeenAt).getTime();
  const rightTimestamp = new Date(right.lastSeenAt).getTime();

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp > leftTimestamp ? right : left;
  }

  const leftConfidence =
    left.judgeOutput.confidenceScore +
    left.scores.borealFitScore +
    left.evidence.length / 10;
  const rightConfidence =
    right.judgeOutput.confidenceScore +
    right.scores.borealFitScore +
    right.evidence.length / 10;

  return rightConfidence > leftConfidence ? right : left;
}

function mergeProblemIntelEvidence(
  ...lists: ProblemIntelProblem["evidence"][]
): ProblemIntelProblem["evidence"] {
  const map = new Map<string, ProblemIntelProblem["evidence"][number]>();

  for (const list of lists) {
    for (const item of list) {
      const key = item.url
        ? `url:${item.url}`
        : `excerpt:${normalizeProblemIntelText(item.sourceLabel)}:${normalizeProblemIntelText(item.excerpt)}`;

      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }

  return [...map.values()].sort((left, right) =>
    left.observedAt < right.observedAt ? -1 : left.observedAt > right.observedAt ? 1 : 0
  );
}

function mergeProblemIntelControlledTags(
  left: ProblemIntelProblem["controlledTags"],
  right: ProblemIntelProblem["controlledTags"]
) {
  const merged: ProblemIntelProblem["controlledTags"] = {};
  const families = new Set([
    ...Object.keys(left),
    ...Object.keys(right),
  ]) as Set<keyof ProblemIntelProblem["controlledTags"]>;

  for (const family of families) {
    merged[family] = uniqueStrings([...(left[family] ?? []), ...(right[family] ?? [])]);
  }

  return merged;
}

function getProblemIntelAliases(problem: ProblemIntelProblem) {
  return new Set(
    uniqueStrings([problem.problemId, problem.canonicalTitle, ...problem.tagAliases])
      .map((value) => normalizeProblemIntelText(value))
      .filter(Boolean)
  );
}

function getProblemIntelTagSet(
  problem: ProblemIntelProblem,
  family: keyof ProblemIntelProblem["controlledTags"]
) {
  return new Set(
    (problem.controlledTags[family] ?? [])
      .map((value) => normalizeProblemIntelText(value))
      .filter(Boolean)
  );
}

function getProblemIntelTerms(...values: string[]) {
  return new Set(
    values
      .flatMap((value) =>
        normalizeProblemIntelText(value)
          .split(" ")
          .map((term) => term.trim())
          .filter(Boolean)
      )
      .filter((term) => term.length > 2 && !problemIntelStopWords.has(term))
  );
}

function normalizeProblemIntelText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const item of left) {
    if (right.has(item)) {
      intersection += 1;
    }
  }

  const union = new Set([...left, ...right]).size;

  return union === 0 ? 0 : intersection / union;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
