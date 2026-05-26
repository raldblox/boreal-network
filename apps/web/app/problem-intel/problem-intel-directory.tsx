"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type {
  ProblemIntelProblemView,
  ProblemIntelPublicReport,
  ProblemIntelSource,
} from "@/lib/problem-intel";
import { ProblemIntelActions } from "./problem-intel-actions";

type DetailTab = "overview" | "plan" | "request" | "tags";

export function ProblemIntelDirectory({
  report,
  source,
  problems,
  isEditable,
}: {
  report: ProblemIntelPublicReport;
  source: ProblemIntelSource;
  problems: ProblemIntelProblemView[];
  isEditable: boolean;
}) {
  const rankedProblems = useMemo(
    () =>
      [...problems].sort((left, right) => {
        const leftScore =
          left.scores.borealFitScore +
          left.scores.willingnessToPayScore +
          left.scores.urgencyScore;
        const rightScore =
          right.scores.borealFitScore +
          right.scores.willingnessToPayScore +
          right.scores.urgencyScore;

        return rightScore - leftScore;
      }),
    [problems]
  );

  const [selectedProblemId, setSelectedProblemId] = useState(
    rankedProblems[0]?.problemId ?? null
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const selectedProblem =
    rankedProblems.find((problem) => problem.problemId === selectedProblemId) ??
    rankedProblems[0] ??
    null;

  const tagFamilies = useMemo(() => buildTagLeaderboards(rankedProblems), [
    rankedProblems,
  ]);

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#17304a_0%,#0b1018_45%,#06080d_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                Boreal Problem Intel
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Problem directory with preloaded plans and request drafts.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                Every problem now has a repo-local directory bundle. Clicking a
                problem or request draft opens the preloaded plan, evaluation, and
                draft request shape if it already exists.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-white/75 sm:grid-cols-2">
              <StatCard label="Problems" value={String(report.summary.problemCount)} />
              <StatCard label="Clusters" value={String(report.summary.clusterCount)} />
              <StatCard label="Generated" value={formatDate(report.generatedAt)} />
              <StatCard
                label="Source"
                value={
                  source.kind === "live"
                    ? "Local automation snapshot"
                    : "Fallback sample"
                }
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Run: {report.sourceRunId}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Window: {formatDate(report.window.from)} to {formatDate(report.window.to)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Snapshot: {source.path}
            </span>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/10 bg-black/20 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
                Problems
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Click a problem to load the saved plan bundle.
              </p>
            </div>
            <div className="space-y-2">
              {rankedProblems.map((problem) => (
                <button
                  key={problem.problemId}
                  type="button"
                  onClick={() => {
                    setSelectedProblemId(problem.problemId);
                    setDetailTab("overview");
                  }}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    selectedProblem?.problemId === problem.problemId
                      ? "border-cyan-300/35 bg-cyan-300/12"
                      : "border-white/8 bg-white/5 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {problem.canonicalTitle}
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        {problem.mentionCount} mentions | {problem.judgeOutput.verdict}
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/60">
                      {problem.storage.kind === "problem_directory"
                        ? "preloaded"
                        : "snapshot"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-white/8 pt-4">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
                Request drafts
              </h2>
              <p className="mt-2 text-sm text-white/65">
                Click to jump straight into the derived request draft.
              </p>
              <div className="mt-3 space-y-2">
                {rankedProblems.map((problem) => (
                  <button
                    key={`${problem.problemId}-request`}
                    type="button"
                    onClick={() => {
                      setSelectedProblemId(problem.problemId);
                      setDetailTab("request");
                    }}
                    className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                      selectedProblem?.problemId === problem.problemId &&
                      detailTab === "request"
                        ? "border-emerald-300/35 bg-emerald-300/12"
                        : "border-white/8 bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <div className="text-sm font-medium text-white">
                      {problem.requestTemplate.brief.title}
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      {problem.promotion?.status ?? problem.promotionRecommendation}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-white/8 pt-4">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
                Tag leaders
              </h2>
              <div className="mt-3 space-y-3">
                {tagFamilies.slice(0, 4).map((family) => (
                  <div key={family.family} className="rounded-[18px] border border-white/8 bg-white/5 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      {family.family}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {family.tags.slice(0, 4).map(([tag, count]) => (
                        <span
                          key={`${family.family}-${tag}`}
                          className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/70"
                        >
                          {tag} | {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            {selectedProblem ? (
              <>
                <div className="flex flex-col gap-3 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2 text-xs text-white/55">
                      <span>{selectedProblem.audience}</span>
                      <span>|</span>
                      <span>{selectedProblem.mentionCount} mentions</span>
                      <span>|</span>
                      <span>{selectedProblem.storage.path}</span>
                    </div>
                    <h2 className="mt-2 text-3xl font-semibold text-white">
                      {selectedProblem.canonicalTitle}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/72 sm:text-base">
                      {selectedProblem.problemStatement}
                    </p>
                  </div>
                  <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
                    <ScoreCard
                      label="Boreal fit"
                      value={formatScore(selectedProblem.scores.borealFitScore)}
                    />
                    <ScoreCard
                      label="WTP"
                      value={formatScore(
                        selectedProblem.scores.willingnessToPayScore
                      )}
                    />
                    <ScoreCard
                      label="Urgency"
                      value={formatScore(selectedProblem.scores.urgencyScore)}
                    />
                    <ScoreCard
                      label="Frequency"
                      value={formatScore(selectedProblem.scores.frequencyScore)}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <TabButton
                    active={detailTab === "overview"}
                    label="Overview"
                    onClick={() => setDetailTab("overview")}
                  />
                  <TabButton
                    active={detailTab === "plan"}
                    label="Plan"
                    onClick={() => setDetailTab("plan")}
                  />
                  <TabButton
                    active={detailTab === "request"}
                    label="Request Draft"
                    onClick={() => setDetailTab("request")}
                  />
                  <TabButton
                    active={detailTab === "tags"}
                    label="Tags"
                    onClick={() => setDetailTab("tags")}
                  />
                </div>

                {detailTab === "overview" ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                    <Panel title="Evidence">
                      {selectedProblem.evidence.map((item, index) => (
                        <div
                          key={`${selectedProblem.problemId}-evidence-${index}`}
                          className="space-y-1"
                        >
                          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                            {item.sourceLabel}
                          </div>
                          <p className="text-sm leading-6 text-white/72">
                            {item.excerpt}
                          </p>
                        </div>
                      ))}
                    </Panel>
                    <Panel title="Judge">
                      <div className="mb-2 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100">
                        {selectedProblem.judgeOutput.verdict.replace("_", " ")}
                      </div>
                      <p className="text-sm leading-6 text-white/72">
                        {selectedProblem.judgeOutput.reasoning}
                      </p>
                      {selectedProblem.judgeOutput.gaps.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-white/68">
                          {selectedProblem.judgeOutput.gaps.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </Panel>
                    <Panel title="Promotion">
                      <p className="text-sm leading-6 text-white/72">
                        Recommended next step:{" "}
                        <span className="font-medium text-white/88">
                          {selectedProblem.promotionRecommendation}
                        </span>
                      </p>
                      <p className="mt-3 text-sm leading-6 text-white/68">
                        Current owner status:{" "}
                        {selectedProblem.promotion?.status ?? "not promoted yet"}.
                      </p>
                      {selectedProblem.promotion?.requestTemplatePath ? (
                        <p className="mt-3 text-xs text-white/55">
                          Draft file: {selectedProblem.promotion.requestTemplatePath}
                        </p>
                      ) : null}
                    </Panel>
                  </div>
                ) : null}

                {detailTab === "plan" ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <Panel title="Planner">
                      <p className="text-sm leading-6 text-white/72">
                        {selectedProblem.plannerOutput.planSummary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <TagPill tag={selectedProblem.plannerOutput.routeHypothesis} />
                        <TagPill tag={selectedProblem.plannerOutput.offerShape} />
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-white/68">
                        {selectedProblem.plannerOutput.deliverables.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                      <div className="mt-4 border-t border-white/8 pt-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Experiments
                        </div>
                        <ul className="mt-2 space-y-2 text-sm text-white/68">
                          {selectedProblem.plannerOutput.experiments.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </Panel>
                    <Panel title="Plan Evaluation">
                      <div className="grid grid-cols-2 gap-3">
                        <ScoreCard
                          label="Request rooted"
                          value={formatScore(
                            selectedProblem.planEvaluation.requestRootednessScore
                          )}
                        />
                        <ScoreCard
                          label="Proof readiness"
                          value={formatScore(
                            selectedProblem.planEvaluation.proofReadinessScore
                          )}
                        />
                        <ScoreCard
                          label="Realism"
                          value={formatScore(
                            selectedProblem.planEvaluation.fulfillmentRealismScore
                          )}
                        />
                        <ScoreCard
                          label="Clarity"
                          value={formatScore(
                            selectedProblem.planEvaluation.clarityScore
                          )}
                        />
                      </div>
                      <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Verdict
                        </div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {selectedProblem.planEvaluation.verdict}
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-white/72">
                        {selectedProblem.planEvaluation.rationale}
                      </p>
                      {selectedProblem.planEvaluation.blockers.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-white/68">
                          {selectedProblem.planEvaluation.blockers.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </Panel>
                  </div>
                ) : null}

                {detailTab === "request" ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <Panel title="Request Draft">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                        {selectedProblem.requestTemplate.brief.title}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/72">
                        {selectedProblem.requestTemplate.brief.body}
                      </p>
                    </Panel>
                    <Panel title="Request Shape">
                      <div className="space-y-3 text-sm text-white/72">
                        <div>
                          <span className="text-white/45">Visibility:</span>{" "}
                          {selectedProblem.requestTemplate.visibility}
                        </div>
                        <div>
                          <span className="text-white/45">Team mode:</span>{" "}
                          {selectedProblem.requestTemplate.seeking?.teamMode ??
                            "n/a"}
                        </div>
                        <div>
                          <span className="text-white/45">Budget mode:</span>{" "}
                          {selectedProblem.requestTemplate.budget?.mode ?? "n/a"}
                        </div>
                        <div>
                          <span className="text-white/45">Actor kinds:</span>{" "}
                          {selectedProblem.requestTemplate.seeking?.actorKinds.join(
                            ", "
                          ) || "n/a"}
                        </div>
                        <div>
                          <span className="text-white/45">Supply kinds:</span>{" "}
                          {selectedProblem.requestTemplate.seeking?.supplyKinds.join(
                            ", "
                          ) || "n/a"}
                        </div>
                        <div>
                          <span className="text-white/45">Output kinds:</span>{" "}
                          {selectedProblem.requestTemplate.brief.outputKinds.join(
                            ", "
                          ) || "n/a"}
                        </div>
                      </div>
                    </Panel>
                  </div>
                ) : null}

                {detailTab === "tags" ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                    {Object.entries(selectedProblem.controlledTags).map(
                      ([family, tags]) => (
                        <Panel key={family} title={family}>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <TagPill key={`${family}-${tag}`} tag={tag} />
                            ))}
                          </div>
                        </Panel>
                      )
                    )}
                  </div>
                ) : null}

                {isEditable ? (
                  <ProblemIntelActions
                    problemId={selectedProblem.problemId}
                    currentStatus={selectedProblem.promotion?.status ?? null}
                    recommendation={selectedProblem.promotionRecommendation}
                  />
                ) : null}
              </>
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-6 text-white/68">
                No problem-intel entries available yet.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function buildTagLeaderboards(problems: ProblemIntelProblemView[]) {
  const familyMap = new Map<string, Map<string, number>>();

  for (const problem of problems) {
    for (const [family, tags] of Object.entries(problem.controlledTags)) {
      if (!familyMap.has(family)) {
        familyMap.set(family, new Map<string, number>());
      }

      const counts = familyMap.get(family)!;

      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }

  return [...familyMap.entries()]
    .map(([family, counts]) => ({
      family,
      tags: [...counts.entries()].sort((left, right) => right[1] - left[1]),
    }))
    .sort((left, right) => right.tags.length - left.tags.length);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScore(value: number) {
  return `${Math.round(value * 100)}%`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100/80">
      {tag}
    </span>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition ${
        active
          ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"
      }`}
    >
      {label}
    </button>
  );
}
