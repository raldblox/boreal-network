"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  PanOnScrollMode,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  LoaderCircle,
  Search,
  Sparkles,
  Split,
  X,
} from "lucide-react";
import {
  Group as ResizeGroup,
  Panel as ResizePanel,
  type PanelImperativeHandle,
  type PanelSize,
  Separator as ResizeSeparator,
} from "react-resizable-panels";
import { useLocalStorage } from "usehooks-ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  type ChatModel,
} from "@/lib/ai/models";
import {
  matchingLabMockSupplies,
  type MatchingLabCatalogSupply,
} from "@/lib/matching-lab-catalog";
import {
  buildRequestMatchingLabRun,
  searchRequestMatchingLabSupplies,
  type RequestMatchingLabFixture,
  type RequestMatchingLabPhaseMatch,
  type RequestMatchingLabPhaseRoleMatch,
  type RequestMatchingLabSearchHit,
  type RequestMatchingLabWorkflowRun,
} from "@/lib/request-matching-lab";

type MatchingLabClientProps = {
  fixtures: RequestMatchingLabFixture[];
};

type StepState = "idle" | "loading" | "done";

type WorkflowStates = {
  search: StepState;
  plan: StepState;
  match: StepState;
};

type NodeTone = "green" | "amber" | "blue" | "pink" | "violet";

type WorkflowNodeKind = "input" | "task" | "match";

type ExampleAsk = {
  id: string;
  label: string;
  ask: string;
};

type WorkflowMatchOption = RequestMatchingLabPhaseRoleMatch & {
  phaseNodeKey: string;
  score: number;
};

type WorkflowNodeDescriptor = {
  id: string;
  kind: WorkflowNodeKind;
  layoutSignature: string;
  tone: NodeTone;
  laneLabel: string;
  title: string;
  subtitle: string;
  summary: string;
  footerChips: string[];
  width: number;
  initialPosition: { x: number; y: number };
  status: StepState;
  phaseIndex?: number;
  phaseNodeKey?: string;
  phase?: RequestMatchingLabPhaseMatch;
  matchedRole?: WorkflowMatchOption;
  matchOptions?: WorkflowMatchOption[];
  approvedMatchOptions?: WorkflowMatchOption[];
  matchOptionIndex?: number;
  isApproved?: boolean;
};

type WorkflowNodeData = {
  descriptor: WorkflowNodeDescriptor;
  onApproveMatchRoute?: (phaseNodeKey: string, supplyId: string) => void;
  onDeclineMatchRoute?: (phaseNodeKey: string, supplyId: string) => void;
  onInspectSupply?: (supplyId: string) => void;
  teamPreview?: {
    activeCount: number;
    hiddenCount: number;
    members: Array<{
      name: string;
      supplyId?: string;
      subtitle: string;
    }>;
  };
};

type WorkflowRevealState = {
  visibleTaskCount: number;
  visibleMatchCount: number;
};

type InspectorView = "overview" | "json" | "supply";
type MatchingLabNormalizationMode = "llm" | "heuristic";

const defaultWorkflowStates: WorkflowStates = {
  search: "done",
  plan: "done",
  match: "done",
};

const workflowNodeLayout = {
  inputWidth: 452,
  inputHeight: 288,
  taskWidth: 408,
  taskHeight: 248,
  matchWidth: 332,
  matchCompactWidth: 236,
  matchTeamBaseWidth: 260,
  matchTeamWidthStep: 118,
  matchTeamMaxWidth: 620,
  matchHeight: 258,
  startX: 80,
  laneGapX: 192,
  laneGapY: 392,
  matchGapX: 40,
  matchCompactGapX: 20,
  centerY: 340,
} as const;

const nodeTypes = {
  workflow: WorkflowCanvasNode,
};

export function MatchingLabClient({ fixtures }: MatchingLabClientProps) {
  return (
    <ReactFlowProvider>
      <MatchingLabClientInner fixtures={fixtures} />
    </ReactFlowProvider>
  );
}

function MatchingLabClientInner({ fixtures }: MatchingLabClientProps) {
  const exampleAsks = useMemo(
    () =>
      fixtures
        .map((fixture, index) => ({
          id: fixture.scenarioId,
          label: `Example ${index + 1}`,
          ask:
            fixture.requestInput.rawAsk ??
            fixture.requestPatch.brief?.body ??
            fixture.description,
        }))
        .filter((example) => example.ask.trim().length > 0)
        .slice(0, 4),
    [fixtures]
  );

  const initialAsk = "";

  const [draftAsk, setDraftAsk] = useState(initialAsk);
  const [submittedAsk, setSubmittedAsk] = useState("");
  const [hasCanvasStarted, setHasCanvasStarted] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedNormalizationMode, setSelectedNormalizationMode] =
    useLocalStorage<MatchingLabNormalizationMode>(
      "matching-lab-normalization-mode",
      "llm"
    );
  const [selectedChatModel, setSelectedChatModel] =
    useLocalStorage<string>("matching-lab-selected-chat-model", DEFAULT_CHAT_MODEL);
  const [
    requestPromptOptimizerEnabled,
    setRequestPromptOptimizerEnabled,
  ] = useLocalStorage("matching-lab-request-optimizer-enabled", true);
  const [workflow, setWorkflow] = useState<RequestMatchingLabWorkflowRun | null>(
    null
  );
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runNonce, setRunNonce] = useState(0);
  const [workflowStates, setWorkflowStates] = useState<WorkflowStates>(
    defaultWorkflowStates
  );
  const [selectedNodeId, setSelectedNodeId] = useState("input");
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
  const [approvedRouteByPhase, setApprovedRouteByPhase] = useState<
    Record<string, string[]>
  >({});
  const [declinedRouteSupplyIdsByPhase, setDeclinedRouteSupplyIdsByPhase] =
    useState<Record<string, string[]>>({});
  const [inspectorView, setInspectorView] = useState<InspectorView>("overview");
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [isPanMode, setIsPanMode] = useState(true);
  const [revealState, setRevealState] = useState<WorkflowRevealState>({
    visibleTaskCount: 0,
    visibleMatchCount: 0,
  });
  const inspectorPanelRef = useRef<PanelImperativeHandle | null>(null);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<WorkflowNodeData>, Edge> | null
  >(null);

  const workflowAsk =
    submittedAsk.trim() ||
    exampleAsks[0]?.ask ||
    "Need someone to own a HubSpot migration, set up automations, create handoff docs, and train the operator team within three weeks.";
  const activeSelectedChatModel = useMemo(
    () =>
      chatModels.find((model) => model.id === selectedChatModel)?.id ??
      DEFAULT_CHAT_MODEL,
    [selectedChatModel]
  );

  const fallbackWorkflow = useMemo(
    () =>
      buildRequestMatchingLabRun({
        ask: workflowAsk,
        supplies: matchingLabMockSupplies,
      }),
    [workflowAsk]
  );
  const activeWorkflow = workflow ?? fallbackWorkflow;

  const supplyById = useMemo(
    () =>
      new Map(
        matchingLabMockSupplies.map((supply) => [supply.id, supply] as const)
      ),
    []
  );

  const activeCatalogQuery = catalogQuery.trim();
  const catalogHits = useMemo(
    () =>
      searchRequestMatchingLabSupplies({
        ask: activeCatalogQuery || submittedAsk,
        supplies: matchingLabMockSupplies,
      }),
    [activeCatalogQuery, submittedAsk]
  );

  async function runMatchingLab(nextAsk: string) {
    const normalizedAsk = nextAsk.trim();
    if (!normalizedAsk) {
      return;
    }

    setSubmittedAsk(normalizedAsk);
    setHasCanvasStarted(true);
    setWorkflow(null);
    setWorkflowError(null);
    setIsSubmitting(true);
    setRevealState({
      visibleTaskCount: 0,
      visibleMatchCount: 0,
    });
    setWorkflowStates({
      search: "loading",
      plan: "idle",
      match: "idle",
    });
    setApprovedRouteByPhase({});
    setDeclinedRouteSupplyIdsByPhase({});
    setSelectedNodeId("input");
    setInspectorView("overview");

    try {
      const response = await fetch("/api/matching-lab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ask: normalizedAsk,
          normalizationMode: selectedNormalizationMode,
          requestPromptOptimizerEnabled,
          selectedChatModel: activeSelectedChatModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Matching lab route returned a non-OK response.");
      }

      const payload = (await response.json()) as {
        workflow?: RequestMatchingLabWorkflowRun;
      };

      if (!payload.workflow) {
        throw new Error("Matching lab route returned no workflow payload.");
      }

      setWorkflow(payload.workflow);
      setRunNonce((value) => value + 1);
    } catch (error) {
      const fallback = buildRequestMatchingLabRun({
        ask: normalizedAsk,
        supplies: matchingLabMockSupplies,
      });

      setWorkflow({
        ...fallback,
        normalization: {
          source: "heuristic_fallback",
          modelId: activeSelectedChatModel,
          note:
            error instanceof Error && error.message.trim().length > 0
              ? error.message.trim()
              : "Matching lab API was unavailable, so the lab used the heuristic parser.",
        },
      });
      setWorkflowError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "Matching lab API was unavailable."
      );
      setRunNonce((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!hasCanvasStarted || !submittedAsk.trim()) {
      setWorkflowStates(defaultWorkflowStates);
      setRevealState({
        visibleTaskCount: 0,
        visibleMatchCount: 0,
      });
      return;
    }

    if (isSubmitting || !workflow) {
      setWorkflowStates({
        search: "loading",
        plan: "idle",
        match: "idle",
      });
      setRevealState({
        visibleTaskCount: 0,
        visibleMatchCount: 0,
      });
      return;
    }

    const totalPhases = workflow.phaseMatches.length;

    if (runNonce === 0) {
      setWorkflowStates(defaultWorkflowStates);
      setRevealState({
        visibleTaskCount: totalPhases,
        visibleMatchCount: totalPhases,
      });
      return;
    }

    setRevealState({
      visibleTaskCount: 0,
      visibleMatchCount: 0,
    });
    setWorkflowStates({
      search: "loading",
      plan: "idle",
      match: "idle",
    });

    const timers: number[] = [];
    const searchBaseDelay = 220;
    const taskBaseDelay = 420;
    const taskInterval = 220;
    const matchLeadDelay = 180;
    const matchInterval = 220;

    timers.push(window.setTimeout(() => {
      setWorkflowStates({
        search: "done",
        plan: "loading",
        match: "idle",
      });
    }, searchBaseDelay));

    workflow.phaseMatches.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setRevealState((current) => ({
            ...current,
            visibleTaskCount: Math.max(current.visibleTaskCount, index + 1),
          }));
        }, taskBaseDelay + index * taskInterval)
      );
    });

    const matchBaseDelay =
      taskBaseDelay + totalPhases * taskInterval + matchLeadDelay;

    timers.push(window.setTimeout(() => {
      setWorkflowStates({
        search: "done",
        plan: "done",
        match: "loading",
      });
    }, matchBaseDelay - 80));

    workflow.phaseMatches.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setRevealState((current) => ({
            ...current,
            visibleMatchCount: Math.max(current.visibleMatchCount, index + 1),
          }));
        }, matchBaseDelay + index * matchInterval)
      );
    });

    const finalDelay =
      matchBaseDelay + Math.max(totalPhases - 1, 0) * matchInterval + 220;

    timers.push(window.setTimeout(() => {
      setWorkflowStates(defaultWorkflowStates);
    }, finalDelay));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [hasCanvasStarted, isSubmitting, runNonce, submittedAsk, workflow]);

  const searchHitMap = useMemo(
    () =>
      new Map(
        activeWorkflow.searchHits.map((hit, index) => [
          hit.supplyId,
          { ...hit, rank: index + 1 },
        ])
      ),
    [activeWorkflow.searchHits]
  );

  const leadRankingMap = useMemo(
    () =>
      new Map(
        activeWorkflow.actual.matching.leadRanking.map((supplyId, index) => [
          supplyId,
          index + 1,
        ])
      ),
    [activeWorkflow.actual.matching.leadRanking]
  );

  const catalogSupplies = useMemo(
    () =>
      matchingLabMockSupplies
        .filter((supply) => {
          if (!activeCatalogQuery) {
            return true;
          }

          return catalogHits.some((hit) => hit.supplyId === supply.id);
        })
        .slice()
        .sort((left, right) => {
          const leftHit =
            catalogHits.find((hit) => hit.supplyId === left.id) ??
            activeWorkflow.searchHits.find((hit) => hit.supplyId === left.id);
          const rightHit =
            catalogHits.find((hit) => hit.supplyId === right.id) ??
            activeWorkflow.searchHits.find((hit) => hit.supplyId === right.id);
          const scoreDelta = (rightHit?.score ?? -1) - (leftHit?.score ?? -1);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }

          return left.profile.displayName.localeCompare(right.profile.displayName);
        }),
    [activeCatalogQuery, activeWorkflow.searchHits, catalogHits]
  );

  const matchOptionsByPhase = useMemo(
    () =>
      buildMatchOptionsByPhase({
        workflow: activeWorkflow,
      }),
    [activeWorkflow]
  );

  const visibleMatchOptionsByPhase = useMemo(
    () =>
      new Map(
        Array.from(matchOptionsByPhase.entries()).map(([phaseNodeKey, options]) => [
          phaseNodeKey,
          options.filter((option) => {
            const declinedSupplyIds =
              declinedRouteSupplyIdsByPhase[phaseNodeKey] ?? [];

            if (!option.supplyId) {
              return true;
            }

            return !declinedSupplyIds.includes(option.supplyId);
          }),
        ])
      ),
    [declinedRouteSupplyIdsByPhase, matchOptionsByPhase]
  );

  const allDescriptors = useMemo(
    () =>
      buildNodeDescriptors({
        approvedRouteByPhase,
        matchOptionsByPhase: visibleMatchOptionsByPhase,
        requestedNormalizationMode: selectedNormalizationMode,
        showExpandedFlow: !isSubmitting && workflow !== null,
        workflow: activeWorkflow,
        workflowError,
        workflowStates,
      }),
    [
      activeWorkflow,
      approvedRouteByPhase,
      isSubmitting,
      visibleMatchOptionsByPhase,
      selectedNormalizationMode,
      workflow,
      workflowError,
      workflowStates,
    ]
  );

  const descriptors = useMemo(
    () =>
      allDescriptors.filter((descriptor) => {
        if (descriptor.kind === "input") {
          return true;
        }

        const index = descriptor.phaseIndex ?? 0;
        if (descriptor.kind === "task") {
          return index < revealState.visibleTaskCount;
        }

        return index < revealState.visibleMatchCount;
      }),
    [allDescriptors, revealState.visibleMatchCount, revealState.visibleTaskCount]
  );

  const descriptorMap = useMemo(
    () => new Map(descriptors.map((descriptor) => [descriptor.id, descriptor] as const)),
    [descriptors]
  );

  const builtNodes = useMemo(
    () =>
      buildFlowNodes({
        approvedRouteByPhase,
        descriptors,
        onApproveMatchRoute: (phaseNodeKey, supplyId) => {
          setApprovedRouteByPhase((current) => ({
            ...current,
            [phaseNodeKey]: Array.from(
              new Set([...(current[phaseNodeKey] ?? []), supplyId])
            ),
          }));
          setDeclinedRouteSupplyIdsByPhase((current) => ({
            ...current,
            [phaseNodeKey]: (current[phaseNodeKey] ?? []).filter(
              (candidateSupplyId) => candidateSupplyId !== supplyId
            ),
          }));
        },
        onDeclineMatchRoute: (phaseNodeKey, supplyId) => {
          setDeclinedRouteSupplyIdsByPhase((current) => ({
            ...current,
            [phaseNodeKey]: Array.from(
              new Set([...(current[phaseNodeKey] ?? []), supplyId])
            ),
          }));
          setApprovedRouteByPhase((current) => ({
            ...current,
            [phaseNodeKey]: (current[phaseNodeKey] ?? []).filter(
              (candidateSupplyId) => candidateSupplyId !== supplyId
            ),
          }));
        },
        onInspectSupply: (supplyId) => {
          setSelectedSupplyId(supplyId);
          setInspectorView("supply");
          inspectorPanelRef.current?.expand();
          setIsInspectorCollapsed(false);
        },
      }),
    [approvedRouteByPhase, descriptors]
  );

  const builtEdges = useMemo(
    () => buildFlowEdges(descriptors),
    [descriptors]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes((currentNodes) =>
      mergeFlowNodes({
        currentNodes,
        nextNodes: builtNodes,
        selectedNodeId,
      })
    );
  }, [builtNodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  useEffect(() => {
    if (!descriptorMap.has(selectedNodeId)) {
      setSelectedNodeId("input");
    }
  }, [descriptorMap, selectedNodeId]);

  useEffect(() => {
    if (catalogSupplies.length === 0) {
      setSelectedSupplyId(null);
      return;
    }

    if (
      selectedSupplyId &&
      catalogSupplies.some((supply) => supply.id === selectedSupplyId)
    ) {
      return;
    }

    const preferredSupplyId =
      activeWorkflow.actual.matching.leadRankingDetails.find(
        (entry) => entry.supplyId
      )?.supplyId ??
      catalogSupplies[0]?.id ??
      null;

    setSelectedSupplyId(preferredSupplyId);
  }, [
    activeWorkflow.actual.matching.leadRankingDetails,
    catalogSupplies,
    selectedSupplyId,
  ]);

  useEffect(() => {
    if (inspectorView === "supply" && !selectedSupplyId) {
      setInspectorView("overview");
    }
  }, [inspectorView, selectedSupplyId]);

  useEffect(() => {
    if (!flowInstance || !hasCanvasStarted) {
      return;
    }

    window.requestAnimationFrame(() => {
      flowInstance.fitView({
        duration: runNonce > 0 ? 540 : 320,
        maxZoom: 1.05,
        padding: 0.18,
      });
    });
  }, [flowInstance, hasCanvasStarted, runNonce, descriptors.length]);

  const selectedDescriptor =
    descriptorMap.get(selectedNodeId) ?? descriptors[0] ?? null;
  const selectedSupply = selectedSupplyId
    ? supplyById.get(selectedSupplyId) ?? null
    : null;

  function toggleInspectorForNode(nodeId: string) {
    const panel = inspectorPanelRef.current;
    const isSameNode = selectedNodeId === nodeId;

    if (isSameNode && !isInspectorCollapsed) {
      panel?.collapse();
      setIsInspectorCollapsed(true);
      return;
    }

    setSelectedNodeId(nodeId);
    setInspectorView("overview");

    if (isInspectorCollapsed) {
      panel?.expand();
      setIsInspectorCollapsed(false);
    }
  }

  function beautifyCanvas() {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const descriptor = descriptorMap.get(node.id);
        if (!descriptor) {
          return node;
        }

        return {
          ...node,
          position: descriptor.initialPosition,
        };
      })
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        flowInstance?.fitView({
          duration: 360,
          maxZoom: 1,
          padding: 0.22,
        });
      });
    });
  }

  const inspectorJson = useMemo(
    () =>
      buildInspectorJson({
        descriptor: selectedDescriptor,
        selectedSupply,
        workflow: activeWorkflow,
      }),
    [activeWorkflow, selectedDescriptor, selectedSupply]
  );

  if (!hasCanvasStarted) {
    return (
      <div className="relative h-full min-h-full w-full overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0">
          <Background
            color="rgba(148, 163, 184, 0.18)"
            gap={28}
            size={1}
            variant={BackgroundVariant.Dots}
          />
        </div>

        <div className="relative flex h-full items-center justify-center px-6">
          <MatchingLabPromptSurface
            ask={draftAsk}
            exampleAsks={exampleAsks}
            isSubmitting={isSubmitting}
            modelLabel={formatMatchingLabModelLabel(activeSelectedChatModel)}
            modelOptions={chatModels}
            normalizationMode={selectedNormalizationMode}
            onAskChange={setDraftAsk}
            onClear={() => {
              setDraftAsk("");
              setSubmittedAsk("");
              setWorkflow(null);
              setWorkflowError(null);
              setIsSubmitting(false);
              setRunNonce(0);
            }}
            onNormalizationModeChange={setSelectedNormalizationMode}
            onRequestPromptOptimizerEnabledChange={
              setRequestPromptOptimizerEnabled
            }
            onSelectedChatModelChange={setSelectedChatModel}
            onRun={() => void runMatchingLab(draftAsk)}
            onSelectExample={(ask) => setDraftAsk(ask)}
            requestPromptOptimizerEnabled={requestPromptOptimizerEnabled}
            selectedChatModel={activeSelectedChatModel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-full w-full bg-background text-foreground">
      <ResizeGroup
        className="h-full"
        id="matching-lab-panels"
        orientation="horizontal"
      >
        <ResizePanel defaultSize="72%" minSize="58%">
          <div className="relative h-full min-h-0 w-full bg-[#0b0b0f]">
            <ReactFlow
              className={cn(
                isPanMode
                  ? "[&_.react-flow__pane]:cursor-grab [&_.react-flow__pane.dragging]:cursor-grabbing"
                  : "[&_.react-flow__pane]:cursor-default"
              )}
              colorMode="dark"
              defaultEdgeOptions={{
                type: "simplebezier",
                style: {
                  stroke: "rgba(148, 163, 184, 0.56)",
                  strokeWidth: 2.15,
                },
              }}
              edges={edges}
              edgesFocusable={false}
              fitView
              maxZoom={1.35}
              minZoom={0.5}
              nodeTypes={nodeTypes}
              nodes={nodes}
              nodesConnectable={false}
              onEdgesChange={onEdgesChange}
              onInit={setFlowInstance}
            onNodeClick={(_, node) => {
                toggleInspectorForNode(node.id);
              }}
              onNodesChange={onNodesChange}
              onPaneClick={() => undefined}
              panOnDrag={isPanMode}
              panOnScroll
              panOnScrollMode={PanOnScrollMode.Free}
              proOptions={{ hideAttribution: true }}
              selectionOnDrag={false}
            >
              <Background
                color="rgba(148, 163, 184, 0.24)"
                gap={28}
                size={1}
                variant={BackgroundVariant.Dots}
              />

              <Controls
                className="[&_button]:!h-9 [&_button]:!w-9 [&_button]:!border-white/10 [&_button]:!bg-[#16161d] [&_button]:!text-zinc-100 [&_button:hover]:!bg-[#20212b]"
                position="bottom-left"
                showInteractive={false}
              />
            </ReactFlow>

            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              <Button
                aria-pressed={isPanMode}
                className={cn(
                  "border-white/10 text-zinc-100 hover:bg-white/10",
                  isPanMode ? "bg-white/[0.1]" : "bg-[#121319]/84"
                )}
                onClick={() => setIsPanMode((value) => !value)}
                size="sm"
                type="button"
                variant="outline"
                >
                  <Hand className="size-4" />
                  {isPanMode ? "Grab on" : "Grab off"}
                </Button>
              <Button
                className="border-white/10 bg-[#121319]/84 text-zinc-100 hover:bg-white/10"
                onClick={() => {
                  setHasCanvasStarted(false);
              setSubmittedAsk("");
              setWorkflow(null);
              setWorkflowError(null);
              setIsSubmitting(false);
              setApprovedRouteByPhase({});
              setDeclinedRouteSupplyIdsByPhase({});
              setRevealState({
                visibleTaskCount: 0,
                visibleMatchCount: 0,
                  });
                  setSelectedNodeId("input");
                  setInspectorView("overview");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear canvas
              </Button>
              <Button
                className="border-white/10 bg-[#121319]/84 text-zinc-100 hover:bg-white/10"
                onClick={beautifyCanvas}
                size="sm"
                type="button"
                variant="outline"
              >
                Beautify
              </Button>
              <Button
                className="border-white/10 bg-[#121319]/84 text-zinc-100 hover:bg-white/10"
                onClick={() =>
                  flowInstance?.fitView({
                    duration: 260,
                    maxZoom: 1.05,
                    padding: 0.18,
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Fit canvas
              </Button>
              <Button
                className="border-white/10 bg-[#121319]/84 text-zinc-100 hover:bg-white/10"
                onClick={() => {
                  const panel = inspectorPanelRef.current;
                  if (!panel) {
                    return;
                  }

                  if (panel.isCollapsed()) {
                    panel.expand();
                    setIsInspectorCollapsed(false);
                  } else {
                    panel.collapse();
                    setIsInspectorCollapsed(true);
                  }
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {isInspectorCollapsed ? "Open inspector" : "Hide inspector"}
              </Button>
            </div>

            {isInspectorCollapsed ? (
              <button
                className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#15161d]/92 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-zinc-200 shadow-xl backdrop-blur"
                onClick={() => {
                  inspectorPanelRef.current?.expand();
                  setIsInspectorCollapsed(false);
                }}
                type="button"
              >
                <ChevronLeft className="size-4" />
                Inspector
              </button>
            ) : null}
          </div>
        </ResizePanel>

        <ResizeSeparator className="group relative w-px bg-white/10 transition-colors hover:bg-white/20">
          <div className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/12 transition-colors group-hover:bg-white/24" />
        </ResizeSeparator>

        <ResizePanel
          collapsedSize="0%"
          collapsible
          defaultSize="28%"
          minSize="22%"
          panelRef={inspectorPanelRef}
          onResize={(size: PanelSize) => {
            setIsInspectorCollapsed(size.asPercentage <= 0.5);
          }}
        >
          <InspectorPanel
            approvedRouteByPhase={approvedRouteByPhase}
            activeCatalogQuery={activeCatalogQuery}
            catalogSupplies={catalogSupplies}
            declinedRouteSupplyIdsByPhase={declinedRouteSupplyIdsByPhase}
            inspectorJson={inspectorJson}
            inspectorView={inspectorView}
            leadRankingMap={leadRankingMap}
            matchOptionsByPhase={visibleMatchOptionsByPhase}
            onApproveRoute={(phaseNodeKey, supplyId) => {
              setApprovedRouteByPhase((current) => ({
                ...current,
                [phaseNodeKey]: Array.from(
                  new Set([...(current[phaseNodeKey] ?? []), supplyId])
                ),
              }));
              setDeclinedRouteSupplyIdsByPhase((current) => ({
                ...current,
                [phaseNodeKey]: (current[phaseNodeKey] ?? []).filter(
                  (candidateSupplyId) => candidateSupplyId !== supplyId
                ),
              }));
            }}
            onDeclineRoute={(phaseNodeKey, supplyId) => {
              setDeclinedRouteSupplyIdsByPhase((current) => ({
                ...current,
                [phaseNodeKey]: Array.from(
                  new Set([...(current[phaseNodeKey] ?? []), supplyId])
                ),
              }));
              setApprovedRouteByPhase((current) => ({
                ...current,
                [phaseNodeKey]: (current[phaseNodeKey] ?? []).filter(
                  (candidateSupplyId) => candidateSupplyId !== supplyId
                ),
              }));
            }}
            onCatalogQueryChange={setCatalogQuery}
            onInspectSupply={(supplyId) => {
              setSelectedSupplyId(supplyId);
              setInspectorView("supply");
            }}
            onSetInspectorView={setInspectorView}
            searchHitMap={searchHitMap}
            selectedDescriptor={selectedDescriptor}
            selectedSupply={selectedSupply}
            setSelectedSupplyId={setSelectedSupplyId}
            onCollapseInspector={() => {
              inspectorPanelRef.current?.collapse();
              setIsInspectorCollapsed(true);
            }}
            workflow={activeWorkflow}
          />
        </ResizePanel>
      </ResizeGroup>
    </div>
  );
}

function WorkflowCanvasNode({
  data,
  selected,
}: NodeProps<Node<WorkflowNodeData>>) {
  const descriptor = data.descriptor;
  const tone = getToneStyles(descriptor.tone);
  const matchedSupplyId = descriptor.matchedRole?.supplyId;

  function stopNodeAction(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="relative">
      {descriptor.kind !== "input" ? (
        <Handle
          className={cn(
            "!size-2.5 !border-2 !border-[#0b0b0f] shadow-[0_0_0_4px_rgba(11,11,15,0.72)]",
            tone.handle
          )}
          position={Position.Left}
          type="target"
        />
      ) : null}

      {descriptor.kind !== "match" ? (
        <Handle
          className={cn(
            "!size-2.5 !border-2 !border-[#0b0b0f] shadow-[0_0_0_4px_rgba(11,11,15,0.72)]",
            tone.handle
          )}
          position={Position.Right}
          type="source"
        />
      ) : null}

      <div
        className={cn(
          "group relative overflow-hidden rounded-[28px] border bg-[#111217]/94 p-4 text-zinc-100 backdrop-blur-xl transition-[transform,border-color] duration-200",
          descriptor.approvedMatchOptions?.length ? "rounded-[24px] p-3.5" : null,
          selected
            ? "border-white/22"
            : "border-white/8 hover:-translate-y-0.5 hover:border-white/14"
        )}
        style={{
          width: descriptor.width,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em]">
              <div className={cn("rounded-full border px-2.5 py-1 font-medium", tone.badge)}>
                {descriptor.laneLabel}
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-[15px] border border-white/8",
                  tone.icon
                )}
              >
                {getNodeIcon(descriptor.kind)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium leading-6 text-zinc-50">
                  {descriptor.title}
                </div>
                <div className="text-[12px] leading-5.5 text-zinc-400">
                  {descriptor.subtitle}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <NodeStatusPill state={descriptor.status} />
          </div>
        </div>

        <div className="mt-4 h-px bg-white/6" />

        <div className="mt-4">
          {descriptor.kind === "input" ? (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/7 bg-[#0c0d12]/78 px-4 py-3.5 text-[14px] leading-7 text-zinc-100">
                {descriptor.summary}
              </div>
              <NodeMetaRow chips={descriptor.footerChips} />
            </div>
          ) : null}

          {descriptor.kind === "task" ? (
            <NodeSummaryBlock>
              <div className="rounded-[18px] border border-white/7 bg-[#0c0d12]/72 px-4 py-3.5">
                <ClampedText lines={2}>{descriptor.summary}</ClampedText>
              </div>
              <PlanTeamSlot
                onInspectSupply={data.onInspectSupply}
                teamPreview={data.teamPreview}
              />
              <NodeMetaRow chips={descriptor.footerChips} />
            </NodeSummaryBlock>
          ) : null}

          {descriptor.kind === "match" ? (
            <NodeSummaryBlock>
              {descriptor.matchedRole ? (
                <div className="rounded-[18px] border border-white/7 bg-white/[0.025] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium leading-6 text-zinc-100">
                        {descriptor.matchedRole.supplyTitle ?? "Open worker lane"}
                      </div>
                      <div className="text-[12px] leading-5.5 text-zinc-400">
                        {descriptor.matchedRole.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {descriptor.phaseNodeKey && matchedSupplyId ? (
                        <button
                          aria-label={
                            descriptor.isApproved
                              ? "Route already approved"
                              : "Approve route"
                          }
                          className={cn(
                            "nodrag nopan flex size-7 items-center justify-center rounded-full border transition-colors",
                            descriptor.isApproved
                              ? "border-amber-300/24 bg-amber-300/[0.14] text-amber-100"
                              : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.1] hover:text-zinc-100"
                          )}
                          disabled={descriptor.isApproved}
                          onClick={(event) => {
                            stopNodeAction(event);
                            data.onApproveMatchRoute?.(
                              descriptor.phaseNodeKey!,
                              matchedSupplyId
                            );
                          }}
                          onMouseDown={stopNodeAction}
                          type="button"
                        >
                          <Check className="size-3.5" />
                        </button>
                      ) : null}
                      {descriptor.phaseNodeKey && matchedSupplyId ? (
                        <button
                          aria-label="Decline route"
                          className="nodrag nopan flex size-7 items-center justify-center rounded-full border border-red-300/18 bg-red-300/[0.06] text-red-100 transition-colors hover:bg-red-300/[0.12]"
                          onClick={(event) => {
                            stopNodeAction(event);
                            data.onDeclineMatchRoute?.(
                              descriptor.phaseNodeKey!,
                              matchedSupplyId
                            );
                          }}
                          onMouseDown={stopNodeAction}
                          type="button"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                      <TinyDarkBadge
                        label={descriptor.isApproved ? "active" : "candidate"}
                      />
                    </div>
                  </div>

                  {shouldShowMatchSummary({
                    detail: descriptor.matchedRole.title,
                    summary: descriptor.summary,
                    title: descriptor.matchedRole.supplyTitle ?? "Open worker lane",
                  }) ? (
                    <div className="mt-2 text-[12px] leading-6 text-zinc-500">
                      {descriptor.summary}
                    </div>
                  ) : null}
                </div>
              ) : (
                <CompactPreviewCard
                  badge="open"
                  detail="No worker attached yet"
                  title="Open worker lane"
                />
              )}
              <NodeMetaRow chips={descriptor.footerChips} />
            </NodeSummaryBlock>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InspectorPanel({
  approvedRouteByPhase,
  activeCatalogQuery,
  catalogSupplies,
  declinedRouteSupplyIdsByPhase,
  inspectorJson,
  inspectorView,
  leadRankingMap,
  matchOptionsByPhase,
  onApproveRoute,
  onDeclineRoute,
  onCollapseInspector,
  onCatalogQueryChange,
  onInspectSupply,
  onSetInspectorView,
  searchHitMap,
  selectedDescriptor,
  selectedSupply,
  setSelectedSupplyId,
  workflow,
}: {
  approvedRouteByPhase: Record<string, string[]>;
  activeCatalogQuery: string;
  catalogSupplies: MatchingLabCatalogSupply[];
  declinedRouteSupplyIdsByPhase: Record<string, string[]>;
  inspectorJson: unknown;
  inspectorView: InspectorView;
  leadRankingMap: Map<string, number>;
  matchOptionsByPhase: Map<string, WorkflowMatchOption[]>;
  onApproveRoute: (phaseNodeKey: string, supplyId: string) => void;
  onDeclineRoute: (phaseNodeKey: string, supplyId: string) => void;
  onCollapseInspector: () => void;
  onCatalogQueryChange: (value: string) => void;
  onInspectSupply: (supplyId: string) => void;
  onSetInspectorView: (view: InspectorView) => void;
  searchHitMap: Map<string, RequestMatchingLabSearchHit & { rank: number }>;
  selectedDescriptor: WorkflowNodeDescriptor | null;
  selectedSupply: MatchingLabCatalogSupply | null;
  setSelectedSupplyId: (supplyId: string | null) => void;
  workflow: RequestMatchingLabWorkflowRun;
}) {
  if (!selectedDescriptor) {
    return null;
  }

  const tone = getToneStyles(selectedDescriptor.tone);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-white/8 bg-[#13141a] text-zinc-100">
      <div className="sticky top-0 z-10 border-b border-white/8 bg-[#13141a]/94 px-5 py-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                  tone.badge
                )}
              >
                {selectedDescriptor.laneLabel}
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Node inspector
              </div>
            </div>

            <div className="mt-4 text-[19px] font-medium leading-7 text-zinc-50">
              {selectedDescriptor.title}
            </div>
            <div className="mt-2 text-[13px] leading-7 text-zinc-400">
              {selectedDescriptor.summary}
            </div>
          </div>

          <Button
            className="rounded-full border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.09]"
            onClick={onCollapseInspector}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronRight className="size-4" />
            Hide
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <NodeStatusPill state={selectedDescriptor.status} />
          {selectedDescriptor.footerChips.slice(0, 2).map((chip) => (
            <TinyDarkBadge key={`inspector:${chip}`} label={chip} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <InspectorTabButton
            active={inspectorView === "overview"}
            label="Overview"
            onClick={() => onSetInspectorView("overview")}
          />
          <InspectorTabButton
            active={inspectorView === "json"}
            label="JSON"
            onClick={() => onSetInspectorView("json")}
          />
          <InspectorTabButton
            active={inspectorView === "supply"}
            label="Supply"
            onClick={() => onSetInspectorView("supply")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {inspectorView === "json" ? (
          <div
            className="overflow-x-auto rounded-[22px] border border-white/8 bg-[#0d0e13] p-4 text-[12px] leading-6 text-zinc-300"
          >
            <pre>{JSON.stringify(inspectorJson, null, 2)}</pre>
          </div>
        ) : null}

        {inspectorView === "supply" ? (
          <div className="space-y-4">
            <InspectorSection title="Browse mock supplies">
              <Input
                className="h-11 rounded-[18px] border-white/10 bg-white/[0.03] text-zinc-100 placeholder:text-zinc-500"
                onChange={(event) => onCatalogQueryChange(event.target.value)}
                placeholder="Filter supplies..."
                value={activeCatalogQuery}
              />

              <div className="space-y-2 pt-3">
                {catalogSupplies.map((supply) => (
                  <button
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition-colors",
                      selectedSupply?.id === supply.id
                        ? "border-pink-300/24 bg-pink-300/[0.08]"
                        : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                    )}
                    key={supply.id}
                    onClick={() => setSelectedSupplyId(supply.id)}
                    type="button"
                  >
                    <div>
                      <div className="text-[13px] font-medium leading-6 text-zinc-100">
                        {supply.profile.displayName}
                      </div>
                      <div className="text-[12px] leading-6 text-zinc-500">
                        {supply.profile.headline}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof searchHitMap.get(supply.id)?.rank === "number" ? (
                        <TinyDarkBadge
                          label={`search ${searchHitMap.get(supply.id)?.rank}`}
                        />
                      ) : null}
                      {typeof leadRankingMap.get(supply.id) === "number" ? (
                        <TinyDarkBadge label={`lead ${leadRankingMap.get(supply.id)}`} />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </InspectorSection>

            {selectedSupply ? (
              <InspectorSection title="Selected supply detail">
                <SupplyDetailCard
                  leadRank={leadRankingMap.get(selectedSupply.id)}
                  searchRank={searchHitMap.get(selectedSupply.id)?.rank}
                  supply={selectedSupply}
                />
              </InspectorSection>
            ) : null}
          </div>
        ) : null}

        {inspectorView === "overview" ? (
          <InspectorOverview
            approvedRouteByPhase={approvedRouteByPhase}
            declinedRouteSupplyIdsByPhase={declinedRouteSupplyIdsByPhase}
            matchOptionsByPhase={matchOptionsByPhase}
            onApproveRoute={onApproveRoute}
            onDeclineRoute={onDeclineRoute}
            onInspectSupply={onInspectSupply}
            selectedDescriptor={selectedDescriptor}
            workflow={workflow}
          />
        ) : null}
      </div>
    </div>
  );
}

function InspectorOverview({
  approvedRouteByPhase,
  declinedRouteSupplyIdsByPhase,
  matchOptionsByPhase,
  onApproveRoute,
  onDeclineRoute,
  onInspectSupply,
  selectedDescriptor,
  workflow,
}: {
  approvedRouteByPhase: Record<string, string[]>;
  declinedRouteSupplyIdsByPhase: Record<string, string[]>;
  matchOptionsByPhase: Map<string, WorkflowMatchOption[]>;
  onApproveRoute: (phaseNodeKey: string, supplyId: string) => void;
  onDeclineRoute: (phaseNodeKey: string, supplyId: string) => void;
  onInspectSupply: (supplyId: string) => void;
  selectedDescriptor: WorkflowNodeDescriptor;
  workflow: RequestMatchingLabWorkflowRun;
}) {
  if (selectedDescriptor.kind === "input") {
    return (
      <div className="space-y-4">
        <InspectorSection title="Current ask">
          <DarkCard>{workflow.fixture.requestPatch.brief?.body?.trim() || "No ask yet."}</DarkCard>
        </InspectorSection>
        <InspectorSection title="Search summary">
          <div className="grid gap-3">
            <DarkInfoCard
              label="Normalization"
              value={describeNormalization(workflow.normalization)}
            />
            <DarkInfoCard
              label="Route family"
              value={formatLabel(workflow.actual.routing.routeFamily)}
            />
            <DarkInfoCard
              label="Task lanes"
              value={`${workflow.phaseMatches.length}`}
            />
            <DarkInfoCard
              label="Search hits"
              value={`${workflow.searchHits.length}`}
            />
          </div>
        </InspectorSection>
        {workflow.normalization.note ? (
          <InspectorSection title="Normalization note">
            <DarkTextBlock
              label="Status"
              text={workflow.normalization.note}
            />
          </InspectorSection>
        ) : null}
        <InspectorSection title="Fingerprints">
          <div className="space-y-3">
            <DarkPillSection
              label="Supply kinds"
              values={workflow.actual.fingerprints.supplyKinds.map(formatLabel)}
            />
            <DarkPillSection
              label="Output kinds"
              values={workflow.actual.fingerprints.outputKinds.map(formatLabel)}
            />
            <DarkPillSection
              label="Actor kinds"
              values={workflow.actual.fingerprints.actorKinds.map(formatLabel)}
            />
          </div>
        </InspectorSection>
        <InspectorSection title="Top lexical hits">
          <div className="space-y-3">
            {workflow.searchHits.slice(0, 5).map((hit) => (
              <button
                className="w-full rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                key={hit.supplyId}
                onClick={() => onInspectSupply(hit.supplyId)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium leading-6 text-zinc-100">
                      {hit.supplyId}
                    </div>
                    <div className="text-[12px] leading-6 text-zinc-500">
                      {hit.summary}
                    </div>
                  </div>
                  <TinyDarkBadge label={`score ${hit.score}`} />
                </div>
              </button>
            ))}
          </div>
        </InspectorSection>
      </div>
    );
  }

  if (selectedDescriptor.kind === "task" && selectedDescriptor.phase) {
    const routeOptions = selectedDescriptor.phaseNodeKey
      ? matchOptionsByPhase.get(selectedDescriptor.phaseNodeKey) ?? []
      : [];
    const declinedRouteCount = selectedDescriptor.phaseNodeKey
      ? (declinedRouteSupplyIdsByPhase[selectedDescriptor.phaseNodeKey] ?? []).length
      : 0;
    const approvedSupplyIds = selectedDescriptor.phaseNodeKey
      ? approvedRouteByPhase[selectedDescriptor.phaseNodeKey] ?? []
      : [];
    const approvedOptions = routeOptions.filter(
      (option) => !!option.supplyId && approvedSupplyIds.includes(option.supplyId)
    );

    return (
      <div className="space-y-4">
        <InspectorSection title="Task summary">
          <DarkCard>{selectedDescriptor.phase.summary}</DarkCard>
        </InspectorSection>

        {approvedOptions.length > 0 ? (
          <InspectorSection title={approvedOptions.length === 1 ? "Active route" : "Active routes"}>
            <div className="space-y-3">
              {approvedOptions.map((approvedOption) => (
                <div
                  className="rounded-[20px] border border-amber-300/24 bg-amber-300/[0.08] px-4 py-3"
                  key={`${selectedDescriptor.id}:approved:${approvedOption.supplyId ?? approvedOption.title}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium leading-6 text-zinc-100">
                        {approvedOption.supplyTitle ?? approvedOption.supplyId ?? "Open worker lane"}
                      </div>
                      <div className="text-[12px] leading-6 text-zinc-500">
                        {approvedOption.summary}
                      </div>
                    </div>
                    <TinyDarkBadge label="approved" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {approvedOption.supplyId ? (
                      <Button
                        className="rounded-full border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.08]"
                        onClick={() => onInspectSupply(approvedOption.supplyId!)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Inspect supply
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </InspectorSection>
        ) : null}

        {routeOptions.length > 0 ? (
          <InspectorSection title="Route shortlist">
            <div className="space-y-3">
              {routeOptions.map((routeOption, index) => {
                const isApproved =
                  !!routeOption.supplyId &&
                  approvedSupplyIds.includes(routeOption.supplyId);

                return (
                  <div
                    className={cn(
                      "rounded-[20px] border px-4 py-3",
                      isApproved
                        ? "border-amber-300/24 bg-amber-300/[0.08]"
                        : "border-white/8 bg-white/[0.02]"
                    )}
                    key={`${selectedDescriptor.id}:${routeOption.supplyId ?? index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium leading-6 text-zinc-100">
                          {routeOption.supplyTitle ?? routeOption.supplyId ?? "Open worker lane"}
                        </div>
                        <div className="text-[12px] leading-6 text-zinc-500">
                          {routeOption.summary}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <TinyDarkBadge label={isApproved ? "active route" : `option ${index + 1}`} />
                        <TinyDarkBadge label={formatLabel(routeOption.confidence)} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {routeOption.supplyId ? (
                        <>
                          <Button
                            className={cn(
                              "rounded-full text-zinc-100",
                              isApproved
                                ? "border-amber-300/24 bg-amber-300/[0.14] hover:bg-amber-300/[0.18]"
                                : "bg-zinc-100 text-black hover:bg-zinc-100/92"
                            )}
                            disabled={isApproved}
                            onClick={() =>
                              onApproveRoute(
                                routeOption.phaseNodeKey,
                                routeOption.supplyId!
                              )
                            }
                            size="sm"
                            type="button"
                            variant={isApproved ? "outline" : "default"}
                          >
                            {isApproved ? "Route active" : "Approve route"}
                          </Button>
                          <Button
                            className="rounded-full border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
                            onClick={() => onInspectSupply(routeOption.supplyId!)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Inspect supply
                          </Button>
                          <Button
                            className="rounded-full border-red-300/18 bg-red-300/[0.06] text-red-100 hover:bg-red-300/[0.12]"
                            onClick={() =>
                              onDeclineRoute(
                                routeOption.phaseNodeKey,
                                routeOption.supplyId!
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Decline route
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </InspectorSection>
        ) : null}

        {declinedRouteCount > 0 ? (
          <InspectorSection title="Declined routes">
            <DarkCard>{declinedRouteCount} route {declinedRouteCount === 1 ? "was" : "were"} removed from this lane.</DarkCard>
          </InspectorSection>
        ) : null}

        {selectedDescriptor.phase.requiredEvidenceClaims.length > 0 ? (
          <InspectorSection title="Proof obligations">
            <DarkPillSection
              label="Required proof"
              values={selectedDescriptor.phase.requiredEvidenceClaims.map(formatLabel)}
            />
          </InspectorSection>
        ) : null}

        <InspectorSection title="Role matches">
          <div className="space-y-3">
            {selectedDescriptor.phase.roleMatches.map((roleMatch) => (
              <div
                className="rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3"
                key={`${selectedDescriptor.id}:${roleMatch.roleKey}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium leading-6 text-zinc-100">
                      {roleMatch.title}
                    </div>
                    <div className="text-[12px] leading-6 text-zinc-500">
                      {roleMatch.summary}
                    </div>
                  </div>
                  <TinyDarkBadge
                    label={roleMatch.required ? "required" : "optional"}
                  />
                </div>

                {roleMatch.supplyId ? (
                  <Button
                    className="mt-3 rounded-full border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
                    onClick={() => onInspectSupply(roleMatch.supplyId!)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Inspect {roleMatch.supplyTitle ?? roleMatch.supplyId}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </InspectorSection>
      </div>
    );
  }

  if (selectedDescriptor.kind === "match") {
    const matchedRole = selectedDescriptor.matchedRole;
    const isApproved = Boolean(selectedDescriptor.isApproved);
    const declinedRouteCount = selectedDescriptor.phaseNodeKey
      ? (declinedRouteSupplyIdsByPhase[selectedDescriptor.phaseNodeKey] ?? []).length
      : 0;

    return (
      <div className="space-y-4">
        <InspectorSection title={isApproved ? "Active route" : "Match option"}>
          <DarkCard>{selectedDescriptor.summary}</DarkCard>
        </InspectorSection>

        {selectedDescriptor.approvedMatchOptions?.length ? (
          <InspectorSection title="Approved team">
            <div className="space-y-3">
              {selectedDescriptor.approvedMatchOptions.map((member) => (
                <div
                  className="rounded-[20px] border border-amber-300/24 bg-amber-300/[0.08] px-4 py-3"
                  key={`${selectedDescriptor.id}:team:${member.supplyId ?? member.title}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium leading-6 text-zinc-100">
                        {member.supplyTitle ?? member.supplyId ?? "Open worker lane"}
                      </div>
                      <div className="text-[12px] leading-6 text-zinc-500">
                        {member.title}
                      </div>
                    </div>
                    <TinyDarkBadge label="active" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.supplyId ? (
                      <Button
                        className="rounded-full border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
                        onClick={() => onInspectSupply(member.supplyId!)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Inspect supply
                      </Button>
                    ) : null}
                    {member.supplyId ? (
                      <Button
                        className="rounded-full border-red-300/18 bg-red-300/[0.06] text-red-100 hover:bg-red-300/[0.12]"
                        onClick={() =>
                          onDeclineRoute(
                            member.phaseNodeKey,
                            member.supplyId!
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </InspectorSection>
        ) : null}

        {matchedRole ? (
          <InspectorSection title="Worker assignment">
            <div className="space-y-3">
              <div
                className="rounded-[20px] border border-white/8 bg-[#0f1015] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium leading-6 text-zinc-100">
                      {matchedRole.supplyTitle ?? matchedRole.supplyId ?? "Open worker lane"}
                    </div>
                    <div className="text-[12px] leading-6 text-zinc-500">
                      {matchedRole.summary}
                    </div>
                  </div>
                  <TinyDarkBadge label={formatLabel(matchedRole.confidence)} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-5 text-zinc-500">
                  <span>Role: {matchedRole.title}</span>
                  <span>Status: {formatLabel(matchedRole.status)}</span>
                  <span>{matchedRole.required ? "required" : "optional"}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {matchedRole.supplyId ? (
                    <Button
                      className={cn(
                        "rounded-full text-zinc-100",
                        isApproved
                          ? "border-amber-300/24 bg-amber-300/[0.14] hover:bg-amber-300/[0.18]"
                          : "bg-zinc-100 text-black hover:bg-zinc-100/92"
                      )}
                      disabled={isApproved}
                      onClick={() =>
                        onApproveRoute(
                          matchedRole.phaseNodeKey,
                          matchedRole.supplyId!
                        )
                      }
                      size="sm"
                      type="button"
                      variant={isApproved ? "outline" : "default"}
                    >
                      {isApproved ? "Route active" : "Approve route"}
                    </Button>
                  ) : null}

                  {matchedRole.supplyId ? (
                    <Button
                      className="rounded-full border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
                      onClick={() => onInspectSupply(matchedRole.supplyId!)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Inspect supply
                    </Button>
                  ) : null}
                  {matchedRole.supplyId ? (
                    <Button
                      className="rounded-full border-red-300/18 bg-red-300/[0.06] text-red-100 hover:bg-red-300/[0.12]"
                      onClick={() =>
                        onDeclineRoute(
                          matchedRole.phaseNodeKey,
                          matchedRole.supplyId!
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Decline route
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </InspectorSection>
        ) : null}

        {declinedRouteCount > 0 ? (
          <InspectorSection title="Declined routes">
            <DarkCard>{declinedRouteCount} route {declinedRouteCount === 1 ? "was" : "were"} removed from this lane.</DarkCard>
          </InspectorSection>
        ) : null}

        {selectedDescriptor.phase ? (
          <InspectorSection title="Lane role coverage">
            <div className="space-y-3">
              {selectedDescriptor.phase.roleMatches.map((roleMatch) => (
                <div
                  className="rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3"
                  key={`${selectedDescriptor.id}:${roleMatch.roleKey}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium leading-6 text-zinc-100">
                        {roleMatch.title}
                      </div>
                      <div className="text-[12px] leading-6 text-zinc-500">
                        {roleMatch.summary}
                      </div>
                    </div>
                    <TinyDarkBadge label={formatLabel(roleMatch.confidence)} />
                  </div>
                </div>
              ))}
            </div>
          </InspectorSection>
        ) : null}

        {selectedDescriptor.phase?.requiredEvidenceClaims.length ? (
          <InspectorSection title="Proof obligations">
            <DarkPillSection
              label="Required proof"
              values={selectedDescriptor.phase.requiredEvidenceClaims.map(formatLabel)}
            />
          </InspectorSection>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InspectorSection title="Visible supplies">
        <DarkCard>
          {workflow.searchHits.length} ranked hits for the current request. Open
          the Supply tab to browse the full mock catalog and inspect one listing
          at a time.
        </DarkCard>
      </InspectorSection>
    </div>
  );
}

function SupplyDetailCard({
  leadRank,
  searchRank,
  supply,
}: {
  leadRank?: number;
  searchRank?: number;
  supply: MatchingLabCatalogSupply;
}) {
  return (
    <article className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-medium leading-6 text-zinc-100">
            {supply.profile.displayName}
          </div>
          <div className="mt-1 text-[12px] leading-6 text-zinc-500">
            {supply.profile.headline}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof searchRank === "number" ? (
            <TinyDarkBadge label={`search ${searchRank}`} />
          ) : null}
          {typeof leadRank === "number" ? (
            <TinyDarkBadge label={`lead ${leadRank}`} />
          ) : null}
        </div>
      </div>

      <DarkTextBlock label="Summary" text={supply.profile.summary} />
      <DarkTextBlock
        label="Description"
        text={supply.profile.description ?? "No description set."}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <DarkInfoCard label="Pricing" value={formatPricing(supply.pricing)} />
        <DarkInfoCard
          label="Availability"
          value={
            supply.availability.acceptingRequests
              ? `accepting | ${formatResponseWindow(supply.availability.responseTimeHours)}`
              : "not accepting"
          }
        />
      </div>

      <DarkPillSection
        label="Supply kinds"
        values={supply.capability.supplyKinds.map(formatLabel)}
      />
      <DarkPillSection
        label="Outputs"
        values={supply.capability.outputKinds.map(formatLabel)}
      />
      <DarkPillSection label="Geography" values={supply.metadata.geography} />
      <DarkPillSection label="Proof" values={supply.metadata.proofPackages} />
      <DarkPillSection label="Tooling" values={supply.metadata.tooling} />
      <DarkListBlock label="Typical buyers" items={supply.metadata.typicalBuyers} />
      <DarkListBlock label="Recent work" items={supply.metadata.recentWork} />
      <DarkTextBlock label="Trust notes" text={supply.metadata.trustNotes} />
      <DarkTextBlock
        label="Availability notes"
        text={supply.metadata.availabilityNotes}
      />
      <DarkTextBlock label="Delivery style" text={supply.metadata.deliveryStyle} />
    </article>
  );
}

function getPrimaryPhaseRoleMatch(
  phase: RequestMatchingLabPhaseMatch
): RequestMatchingLabPhaseRoleMatch | undefined {
  return (
    phase.roleMatches.find((roleMatch) => roleMatch.required && roleMatch.supplyId) ??
    phase.roleMatches.find((roleMatch) => Boolean(roleMatch.supplyId)) ??
    phase.roleMatches.find((roleMatch) => roleMatch.required) ??
    phase.roleMatches[0]
  );
}

function getPhaseNodeKey(
  phase: RequestMatchingLabPhaseMatch,
  phaseIndex: number
) {
  return `${phase.phaseKey}:${phaseIndex}`;
}

function getMatchOptionConfidence(score: number) {
  if (score >= 80) {
    return "high";
  }

  if (score >= 45) {
    return "moderate";
  }

  return "low";
}

function getMatchCandidateRoleScore(
  candidate: RequestMatchingLabWorkflowRun["actual"]["matching"]["matchCandidates"][number],
  roleKey: RequestMatchingLabPhaseRoleMatch["roleKey"]
) {
  return (
    candidate.roleScores.find((roleScore) => roleScore.roleKey === roleKey)?.score ?? 0
  );
}

function buildMatchOptionsByPhase({
  workflow,
}: {
  workflow: RequestMatchingLabWorkflowRun;
}) {
  const supplyTitleById = new Map(
    workflow.fixture.candidateSupplies.map((supply) => [
      supply.id,
      supply.profile.displayName,
    ] as const)
  );

  return new Map(
    workflow.phaseMatches.map((phase, phaseIndex) => {
      const phaseNodeKey = getPhaseNodeKey(phase, phaseIndex);
      const primaryRole = getPrimaryPhaseRoleMatch(phase);

      if (!primaryRole) {
        return [phaseNodeKey, [] as WorkflowMatchOption[]] as const;
      }

      const rankedCandidates = workflow.actual.matching.matchCandidates
        .slice()
        .sort((left, right) => {
          const scoreDelta =
            getMatchCandidateRoleScore(right, primaryRole.roleKey) -
            getMatchCandidateRoleScore(left, primaryRole.roleKey);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }

          return right.overallScore - left.overallScore;
        })
        .map((candidate) => {
          const score = getMatchCandidateRoleScore(candidate, primaryRole.roleKey);

          return {
            confidence: getMatchOptionConfidence(score),
            phaseNodeKey,
            required: primaryRole.required,
            roleKey: primaryRole.roleKey,
            score,
            status: "candidate",
            summary:
              candidate.summary || primaryRole.summary || "Pending worker route.",
            supplyId: candidate.supplyId,
            supplyTitle:
              supplyTitleById.get(candidate.supplyId) ??
              candidate.supplyId,
            title: primaryRole.title,
          } satisfies WorkflowMatchOption;
        });

      const searchFallbacks = workflow.searchHits
        .filter(
          (hit) =>
            !rankedCandidates.some((candidate) => candidate.supplyId === hit.supplyId)
        )
        .map((hit) => ({
          confidence: "low",
          phaseNodeKey,
          required: primaryRole.required,
          roleKey: primaryRole.roleKey,
          score: hit.score,
          status: "candidate",
          summary:
            hit.summary || "Fallback supply candidate from the search pool.",
          supplyId: hit.supplyId,
          supplyTitle: supplyTitleById.get(hit.supplyId) ?? hit.supplyId,
          title: primaryRole.title,
        }) satisfies WorkflowMatchOption);

      const seededOptions = dedupeMatchOptions([
        ...rankedCandidates,
        ...searchFallbacks,
      ]);

      if (
        primaryRole.supplyId &&
        !seededOptions.some((option) => option.supplyId === primaryRole.supplyId)
      ) {
        seededOptions.unshift({
          ...primaryRole,
          phaseNodeKey,
          score: 0,
          supplyTitle:
            primaryRole.supplyTitle ??
            supplyTitleById.get(primaryRole.supplyId) ??
            primaryRole.supplyId,
        });
      }

      return [phaseNodeKey, dedupeMatchOptions(seededOptions).slice(0, 3)] as const;
    })
  );
}

function dedupeMatchOptions(options: WorkflowMatchOption[]) {
  const seenSupplyIds = new Set<string>();
  const nextOptions: WorkflowMatchOption[] = [];

  for (const option of options) {
    const dedupeKey = option.supplyId ?? `${option.roleKey}:${option.title}`;
    if (seenSupplyIds.has(dedupeKey)) {
      continue;
    }

    seenSupplyIds.add(dedupeKey);
    nextOptions.push(option);
  }

  return nextOptions;
}

function buildNodeDescriptors({
  approvedRouteByPhase,
  matchOptionsByPhase,
  requestedNormalizationMode,
  showExpandedFlow,
  workflow,
  workflowError,
  workflowStates,
}: {
  approvedRouteByPhase: Record<string, string[]>;
  matchOptionsByPhase: Map<string, WorkflowMatchOption[]>;
  requestedNormalizationMode: MatchingLabNormalizationMode;
  showExpandedFlow: boolean;
  workflow: RequestMatchingLabWorkflowRun;
  workflowError: string | null;
  workflowStates: WorkflowStates;
}) {
  const phaseCount = Math.max(workflow.phaseMatches.length, 1);
  const taskColumnX =
    workflowNodeLayout.startX +
    workflowNodeLayout.inputWidth +
    workflowNodeLayout.laneGapX;
  const matchColumnX =
    taskColumnX + workflowNodeLayout.taskWidth + workflowNodeLayout.laneGapX;
  const firstLaneY =
    workflowNodeLayout.centerY -
    ((phaseCount - 1) * workflowNodeLayout.laneGapY) / 2;
  const inputY =
    workflowNodeLayout.centerY -
    workflowNodeLayout.inputHeight / 2;

  const taskStatus =
    workflowStates.plan === "loading"
      ? "loading"
      : workflowStates.plan === "idle"
        ? "idle"
        : "done";

  const matchStatus =
    workflowStates.match === "loading"
      ? "loading"
      : workflowStates.match === "idle"
        ? "idle"
        : "done";

  const taskDescriptors: WorkflowNodeDescriptor[] = workflow.phaseMatches.map(
    (phase, index) => {
      const phaseNodeKey = getPhaseNodeKey(phase, index);
      const matchOptions = matchOptionsByPhase.get(phaseNodeKey) ?? [];
      const approvedSupplyIds = approvedRouteByPhase[phaseNodeKey] ?? [];
      const approvedMatchOptions = matchOptions.filter(
        (option) => !!option.supplyId && approvedSupplyIds.includes(option.supplyId)
      );

      return {
        id: `task:${phase.phaseKey}:${index}`,
        kind: "task",
        layoutSignature: `task:${index}:${phase.phaseKey}:${phaseCount}`,
        tone: approvedMatchOptions.length > 0 ? "amber" : "blue",
        laneLabel: "Plan lane",
        title: phase.title,
        subtitle: `Plan ${index + 1}`,
        summary: phase.summary,
        footerChips: [
          approvedMatchOptions.length > 0
            ? `${approvedMatchOptions.length} active ${
                approvedMatchOptions.length === 1 ? "route" : "routes"
              }`
            : `${matchOptions.length} route options`,
          phase.requiredEvidenceClaims.length > 0
            ? `${phase.requiredEvidenceClaims.length} proof ${
                phase.requiredEvidenceClaims.length === 1 ? "claim" : "claims"
              }`
            : `${phase.roleMatches.length} role ${
                phase.roleMatches.length === 1 ? "match" : "matches"
              }`,
        ],
        width: workflowNodeLayout.taskWidth,
        initialPosition: {
          x: taskColumnX,
          y: firstLaneY + index * workflowNodeLayout.laneGapY,
        },
        status: taskStatus,
        approvedMatchOptions,
        matchOptions,
        phase,
        phaseIndex: index,
        phaseNodeKey,
      };
    }
  );

  const matchDescriptors: WorkflowNodeDescriptor[] = workflow.phaseMatches.flatMap(
    (phase, index) => {
      const phaseNodeKey = getPhaseNodeKey(phase, index);
      const matchOptions = matchOptionsByPhase.get(phaseNodeKey) ?? [];
      const approvedSupplyIds = approvedRouteByPhase[phaseNodeKey] ?? [];
      const phaseY = firstLaneY + index * workflowNodeLayout.laneGapY;
      const pendingMatchOptions = matchOptions.filter(
        (option) => !option.supplyId || !approvedSupplyIds.includes(option.supplyId)
      );
      const descriptors: WorkflowNodeDescriptor[] = [];
      let cursorX = matchColumnX;

      pendingMatchOptions.forEach((matchedRole, matchOptionIndex) => {
        const hasWorker = Boolean(matchedRole.supplyId);

        descriptors.push({
          id: `match:${phase.phaseKey}:${index}:${matchOptionIndex}`,
          kind: "match",
          layoutSignature: `match:${index}:${phase.phaseKey}:${pendingMatchOptions.length}:${matchOptionIndex}:${phaseCount}`,
          tone: hasWorker ? "pink" : "violet",
          laneLabel: "Matched worker",
          title: matchedRole.supplyTitle ?? "Open worker lane",
          subtitle: matchedRole.title ?? `Worker ${matchOptionIndex + 1}`,
          summary:
            matchedRole.summary ?? "No strong worker candidate is attached yet.",
          footerChips: [
            `option ${matchOptionIndex + 1}`,
            formatLabel(matchedRole.confidence),
          ],
          width: workflowNodeLayout.matchWidth,
          initialPosition: {
            x: cursorX,
            y: phaseY,
          },
          status: matchStatus,
          isApproved: false,
          matchOptionIndex,
          phase,
          matchedRole,
          phaseIndex: index,
          phaseNodeKey,
        });
        cursorX += workflowNodeLayout.matchWidth + workflowNodeLayout.matchGapX;
      });

      return descriptors;
    }
  );

  const inputDescriptor = {
    id: "input",
    kind: "input",
    layoutSignature: `input:${phaseCount}:${requestedNormalizationMode}:${workflowStates.search}`,
    tone: "green",
    laneLabel: "Input source",
    title: "Search request",
    subtitle:
      workflow.normalization.source === "llm"
        ? "LLM normalized > plans > matched workers"
        : "Search > plans > matched workers",
    summary: workflow.fixture.requestPatch.brief?.body?.trim() || "No ask yet.",
    footerChips: [
      workflowStates.search === "loading"
        ? requestedNormalizationMode === "llm"
          ? "llm normalizing"
          : "heuristic parsing"
        : "ready",
      workflow.normalization.source === "llm"
        ? formatMatchingLabModelLabel(
            workflow.normalization.modelId ?? DEFAULT_CHAT_MODEL
          )
        : workflow.normalization.source === "heuristic_fallback"
          ? "heuristic fallback"
          : "heuristic",
      workflowStates.search === "loading"
        ? "waiting for plan"
        : `${workflow.searchHits.length} supply hits`,
      ...(workflowError ? ["api fallback"] : []),
    ],
    width: workflowNodeLayout.inputWidth,
    initialPosition: {
      x: workflowNodeLayout.startX,
      y: inputY,
    },
    status: workflowStates.search,
  } satisfies WorkflowNodeDescriptor;

  if (!showExpandedFlow) {
    return [inputDescriptor];
  }

  return [inputDescriptor, ...taskDescriptors, ...matchDescriptors] satisfies WorkflowNodeDescriptor[];
}

function buildFlowNodes({
  approvedRouteByPhase,
  descriptors,
  onApproveMatchRoute,
  onDeclineMatchRoute,
  onInspectSupply,
}: {
  approvedRouteByPhase: Record<string, string[]>;
  descriptors: WorkflowNodeDescriptor[];
  onApproveMatchRoute: (phaseNodeKey: string, supplyId: string) => void;
  onDeclineMatchRoute: (phaseNodeKey: string, supplyId: string) => void;
  onInspectSupply: (supplyId: string) => void;
}) {
  return descriptors.map((descriptor) => {
    const baseData: WorkflowNodeData = {
      descriptor,
      onApproveMatchRoute,
      onDeclineMatchRoute,
      onInspectSupply,
    };

    if (descriptor.kind === "task" && descriptor.phase) {
      const approvedMatchOptions: WorkflowMatchOption[] =
        descriptor.phaseNodeKey
          ? (descriptor.matchOptions ?? []).filter(
              (option) =>
                !!option.supplyId &&
                (approvedRouteByPhase[descriptor.phaseNodeKey!] ?? []).includes(
                  option.supplyId
                )
            )
          : [];
      baseData.teamPreview = {
        activeCount: approvedMatchOptions.length,
        hiddenCount: Math.max(approvedMatchOptions.length - 4, 0),
        members: approvedMatchOptions.slice(0, 4).map((option) => ({
          name: option.supplyTitle ?? "Open lane",
          supplyId: option.supplyId,
          subtitle: option.title,
        })),
      };
    }

    return {
      id: descriptor.id,
      type: "workflow",
      position: descriptor.initialPosition,
      data: baseData,
      draggable: true,
      selectable: true,
    } satisfies Node<WorkflowNodeData>;
  });
}

function buildFlowEdges(descriptors: WorkflowNodeDescriptor[]) {
  const taskDescriptors = descriptors.filter((descriptor) => descriptor.kind === "task");
  const matchDescriptors = new Map<string, WorkflowNodeDescriptor[]>();

  descriptors
    .filter((descriptor) => descriptor.kind === "match")
    .forEach((descriptor) => {
      if (!descriptor.phaseNodeKey) {
        return;
      }

      const phaseMatches = matchDescriptors.get(descriptor.phaseNodeKey) ?? [];
      phaseMatches.push(descriptor);
      matchDescriptors.set(descriptor.phaseNodeKey, phaseMatches);
    });

  const edges: Edge[] = [];

  taskDescriptors.forEach((descriptor) => {
    edges.push({
      id: `edge:input-${descriptor.id}`,
      source: "input",
      target: descriptor.id,
      type: "simplebezier",
      style: {
        stroke: "rgba(148, 163, 184, 0.42)",
        strokeWidth: 1.85,
      },
    });

    const phaseMatches = descriptor.phaseNodeKey
      ? matchDescriptors.get(descriptor.phaseNodeKey) ?? []
      : [];

    phaseMatches.forEach((matchedDescriptor) => {
      edges.push({
        id: `edge:${descriptor.id}-${matchedDescriptor.id}`,
        source: descriptor.id,
        target: matchedDescriptor.id,
        type: "simplebezier",
        style: matchedDescriptor.isApproved
          ? {
              stroke: "rgba(251, 191, 36, 0.94)",
              strokeWidth: 2.7,
            }
          : {
              stroke: "rgba(148, 163, 184, 0.24)",
              strokeDasharray: "6 9",
              strokeWidth: 1.5,
            },
      });
    });
  });

  return edges.map((edge) => ({
    ...edge,
    animated: false,
    selectable: false,
    focusable: false,
    style: {
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      ...edge.style,
    },
  }));
}

function mergeFlowNodes({
  currentNodes,
  nextNodes,
  selectedNodeId,
}: {
  currentNodes: Array<Node<WorkflowNodeData>>;
  nextNodes: Array<Node<WorkflowNodeData>>;
  selectedNodeId: string;
}) {
  const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node] as const));

  return nextNodes.map((nextNode) => {
    const currentNode = currentNodeMap.get(nextNode.id);
    if (!currentNode) {
      return {
        ...nextNode,
        selected: nextNode.id === selectedNodeId,
      };
    }

    const currentSignature = currentNode.data?.descriptor.layoutSignature;
    const nextSignature = nextNode.data?.descriptor.layoutSignature;
    if (currentSignature !== nextSignature) {
      return {
        ...nextNode,
        selected: nextNode.id === selectedNodeId,
      };
    }

    return {
      ...nextNode,
      position: currentNode.position,
      selected: nextNode.id === selectedNodeId,
    };
  });
}

function buildInspectorJson({
  descriptor,
  selectedSupply,
  workflow,
}: {
  descriptor: WorkflowNodeDescriptor | null;
  selectedSupply: MatchingLabCatalogSupply | null;
  workflow: RequestMatchingLabWorkflowRun;
}) {
  if (!descriptor) {
    return {};
  }

  if (descriptor.kind === "input") {
    return {
      node: descriptor,
      normalization: workflow.normalization,
      requestPatch: workflow.fixture.requestPatch,
      searchHits: workflow.searchHits,
      routing: workflow.actual.routing,
      fingerprints: workflow.actual.fingerprints,
    };
  }

  if (descriptor.kind === "task") {
    return {
      node: descriptor,
      approvedMatchOptions: descriptor.approvedMatchOptions,
      matchOptions: descriptor.matchOptions,
      phase: descriptor.phase,
    };
  }

  return {
    approved: descriptor.isApproved,
    matchOptions: descriptor.phaseNodeKey
      ? descriptor.matchOptions
      : undefined,
    node: descriptor,
    phase: descriptor.phase,
    matchedRole: descriptor.matchedRole,
    selectedSupply,
  };
}

function getNodeIcon(kind: WorkflowNodeKind) {
  switch (kind) {
    case "input":
      return <Search className="size-5" />;
    case "task":
      return <Split className="size-5" />;
    case "match":
      return <Sparkles className="size-5" />;
  }
}

function getToneStyles(tone: NodeTone) {
  switch (tone) {
    case "green":
      return {
        badge: "border-emerald-300/24 bg-emerald-300/[0.12] text-emerald-200",
        icon: "bg-emerald-200/92 text-emerald-950",
        surface: "bg-transparent",
        selectedGlow: "bg-transparent",
        handle: "!bg-emerald-200",
      };
    case "amber":
      return {
        badge: "border-amber-300/24 bg-amber-300/[0.12] text-amber-200",
        icon: "bg-amber-200/92 text-amber-950",
        surface: "bg-transparent",
        selectedGlow: "bg-transparent",
        handle: "!bg-amber-200",
      };
    case "blue":
      return {
        badge: "border-sky-300/24 bg-sky-300/[0.12] text-sky-200",
        icon: "bg-sky-200/92 text-sky-950",
        surface: "bg-transparent",
        selectedGlow: "bg-transparent",
        handle: "!bg-sky-200",
      };
    case "pink":
      return {
        badge: "border-pink-300/24 bg-pink-300/[0.12] text-pink-200",
        icon: "bg-pink-200/92 text-pink-950",
        surface: "bg-transparent",
        selectedGlow: "bg-transparent",
        handle: "!bg-pink-200",
      };
    case "violet":
      return {
        badge: "border-violet-300/24 bg-violet-300/[0.12] text-violet-200",
        icon: "bg-violet-200/92 text-violet-950",
        surface: "bg-transparent",
        selectedGlow: "bg-transparent",
        handle: "!bg-violet-200",
      };
  }
}

function NodeSummaryBlock({ children }: { children: ReactNode }) {
  return <div className="space-y-3.5">{children}</div>;
}

function ClampedText({
  children,
  lines,
}: {
  children: ReactNode;
  lines: number;
}) {
  return (
    <div
      className="overflow-hidden text-[14px] leading-7 text-zinc-100"
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
      }}
    >
      {children}
    </div>
  );
}

function shouldShowMatchSummary({
  detail,
  summary,
  title,
}: {
  detail: string;
  summary: string;
  title: string;
}) {
  const normalizedSummary = summary.trim().toLowerCase();
  if (!normalizedSummary) {
    return false;
  }

  const normalizedTitle = title.trim().toLowerCase();
  const normalizedDetail = detail.trim().toLowerCase();

  if (
    normalizedSummary === normalizedTitle ||
    normalizedSummary === `${normalizedTitle} best fits ${normalizedDetail}.`
  ) {
    return false;
  }

  return true;
}

function MatchingLabPromptSurface({
  ask,
  exampleAsks,
  isSubmitting,
  modelLabel,
  modelOptions,
  normalizationMode,
  onAskChange,
  onClear,
  onNormalizationModeChange,
  onRequestPromptOptimizerEnabledChange,
  onRun,
  onSelectedChatModelChange,
  onSelectExample,
  requestPromptOptimizerEnabled,
  selectedChatModel,
}: {
  ask: string;
  exampleAsks: ExampleAsk[];
  isSubmitting: boolean;
  modelLabel: string;
  modelOptions: ChatModel[];
  normalizationMode: MatchingLabNormalizationMode;
  onAskChange: (value: string) => void;
  onClear: () => void;
  onNormalizationModeChange: (value: MatchingLabNormalizationMode) => void;
  onRequestPromptOptimizerEnabledChange: (value: boolean) => void;
  onRun: () => void;
  onSelectedChatModelChange: (value: string) => void;
  onSelectExample: (ask: string) => void;
  requestPromptOptimizerEnabled: boolean;
  selectedChatModel: string;
}) {
  return (
    <div className="w-full max-w-[78rem] px-4">
      <div className="mx-auto max-w-[54rem] text-center">
        <h1 className="text-[34px] font-medium tracking-[-0.03em] text-zinc-50 sm:text-[52px]">
          What work should Boreal route?
        </h1>
        <p className="mt-4 text-[14px] leading-7 text-zinc-500 sm:text-[15px]">
          Start with one prompt. Boreal expands it into search, plans, and matched workers.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[72rem] overflow-hidden rounded-[30px] border border-white/8 bg-[#121317] text-zinc-100 shadow-[0_26px_70px_-42px_rgba(0,0,0,0.78)]">
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <textarea
            className="min-h-[140px] w-full resize-none bg-transparent text-[18px] leading-8 text-zinc-50 outline-none placeholder:text-zinc-500 sm:min-h-[132px] sm:text-[20px]"
            onChange={(event) => onAskChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onRun();
              }
            }}
            placeholder="Ask Boreal to search, plan, and match work."
            value={ask}
          />
        </div>

        <div className="border-t border-white/8 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
                  normalizationMode === "llm"
                    ? "border-emerald-300/24 bg-emerald-300/[0.12] text-emerald-200"
                    : "border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                )}
                disabled={isSubmitting}
                onClick={() => onNormalizationModeChange("llm")}
                type="button"
              >
                LLM
              </button>
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
                  normalizationMode === "heuristic"
                    ? "border-sky-300/24 bg-sky-300/[0.12] text-sky-200"
                    : "border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                )}
                disabled={isSubmitting}
                onClick={() => onNormalizationModeChange("heuristic")}
                type="button"
              >
                Heuristic
              </button>
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
                  requestPromptOptimizerEnabled
                    ? "border-pink-300/24 bg-pink-300/[0.12] text-pink-200"
                    : "border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                )}
                disabled={isSubmitting || normalizationMode !== "llm"}
                onClick={() =>
                  onRequestPromptOptimizerEnabledChange(
                    !requestPromptOptimizerEnabled
                  )
                }
                type="button"
              >
                {requestPromptOptimizerEnabled ? "Optimizer on" : "Optimizer off"}
              </button>

              {normalizationMode === "llm" ? (
                <Select
                  disabled={isSubmitting}
                  onValueChange={onSelectedChatModelChange}
                  value={selectedChatModel}
                >
                  <SelectTrigger className="h-9 min-w-[11rem] rounded-full border-white/10 bg-white/[0.04] px-3 text-[12px] text-zinc-100">
                    <SelectValue placeholder="Choose model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {isSubmitting
                  ? "Generating flow"
                  : normalizationMode === "llm"
                    ? `LLM ${modelLabel}`
                    : "Local heuristic"}
              </div>
              <Button
                className="rounded-full bg-zinc-100 text-black hover:bg-zinc-100/92"
                disabled={isSubmitting}
                onClick={onRun}
                size="sm"
                type="button"
              >
                {isSubmitting ? "Thinking..." : "Generate"}
              </Button>
              <Button
                className="rounded-full border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.09]"
                disabled={isSubmitting}
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Examples
            </div>
            {exampleAsks.map((example) => (
              <button
                className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-white/14 hover:bg-white/[0.08]"
                key={example.id}
                onClick={() => onSelectExample(example.ask)}
                type="button"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeMetaRow({ chips }: { chips: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
      {chips.map((chip) => (
        <span key={chip}>{chip}</span>
      ))}
    </div>
  );
}

function CompactPreviewCard({
  badge,
  detail,
  title,
}: {
  badge?: string;
  detail: string;
  title: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/7 bg-white/[0.025] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium leading-6 text-zinc-100">
            {title}
          </div>
          <div className="text-[12px] leading-6 text-zinc-400">{detail}</div>
        </div>
        {badge ? <TinyDarkBadge label={badge} /> : null}
      </div>
    </div>
  );
}

function PlanTeamSlot({
  teamPreview,
  onInspectSupply,
}: {
  teamPreview?: WorkflowNodeData["teamPreview"];
  onInspectSupply?: (supplyId: string) => void;
}) {
  const members = teamPreview?.members ?? [];
  const activeCount = teamPreview?.activeCount ?? 0;
  const hiddenCount = teamPreview?.hiddenCount ?? 0;

  return (
    <div className="min-h-[88px] rounded-[18px] border border-white/7 bg-white/[0.025] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Team
        </div>
        <TinyDarkBadge
          label={`${activeCount} ${activeCount === 1 ? "worker" : "workers"}`}
        />
      </div>

      {members.length > 0 ? (
        <div className="mt-3 flex items-center gap-2 overflow-hidden">
          {members.map((member) => (
            <button
              aria-label={`Inspect ${member.name}`}
              className="nodrag nopan flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-300/20 bg-amber-200/92 text-[11px] font-medium text-amber-950 transition-transform hover:-translate-y-0.5"
              key={`${member.supplyId ?? member.name}:${member.subtitle}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (member.supplyId) {
                  onInspectSupply?.(member.supplyId);
                }
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              title={member.name}
              type="button"
            >
              {member.name.slice(0, 1).toUpperCase()}
            </button>
          ))}
          {hiddenCount > 0 ? (
            <div className="flex h-10 shrink-0 items-center rounded-full border border-white/8 bg-white/[0.04] px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-300">
              +{hiddenCount}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex h-10 items-center text-[12px] leading-6 text-zinc-500">
          No approved workers yet.
        </div>
      )}
    </div>
  );
}

function MiniListItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px] leading-6 text-zinc-400">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-600" />
      <span>{text}</span>
    </div>
  );
}

function NodeStatusPill({ state }: { state: StepState }) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
        state === "done" &&
          "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-300",
        state === "loading" &&
          "border-amber-300/18 bg-amber-400/[0.08] text-amber-300",
        state === "idle" &&
          "border-white/10 bg-white/[0.03] text-zinc-400"
      )}
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-1.5">
          <LoaderCircle className="size-3 animate-spin" />
          loading
        </span>
      ) : state === "done" ? (
        "completed"
      ) : (
        "idle"
      )}
    </div>
  );
}

function TinyDarkBadge({ label }: { label: string }) {
  return (
    <Badge
      className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
      variant="secondary"
    >
      {label}
    </Badge>
  );
}

function InspectorSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3.5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </div>
      {children}
    </section>
  );
}

function InspectorTabButton({
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
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors",
        active
          ? "border-pink-300/24 bg-pink-300/[0.12] text-pink-200"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function DarkCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[#0f1015] px-4 py-3.5 text-[13px] leading-7 text-zinc-200 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.76)]">
      {children}
    </div>
  );
}

function DarkInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0f1015] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[13px] leading-6 text-zinc-100">{value}</div>
    </div>
  );
}

function DarkPillSection({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <TinyDarkBadge key={`${label}:${value}`} label={value} />
        ))}
      </div>
    </div>
  );
}

function DarkListBlock({
  items,
  label,
}: {
  items: string[];
  label: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0f1015] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div
            className="text-[12px] leading-6 text-zinc-400"
            key={`${label}:${item}`}
          >
            - {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function DarkTextBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0f1015] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[12px] leading-6 text-zinc-300">{text}</div>
    </div>
  );
}

function formatPricing(pricing: MatchingLabCatalogSupply["pricing"]) {
  if (!pricing) {
    return "not set";
  }

  if (pricing.mode === "fixed" && pricing.currency && pricing.fixedAmount != null) {
    return `${pricing.currency} ${pricing.fixedAmount}`;
  }

  if (
    pricing.mode === "range" &&
    pricing.currency &&
    pricing.minAmount != null &&
    pricing.maxAmount != null
  ) {
    return `${pricing.currency} ${pricing.minAmount}-${pricing.maxAmount}`;
  }

  if (pricing.mode === "quote") {
    return pricing.currency ? `quote | ${pricing.currency}` : "quote";
  }

  if (pricing.mode === "open") {
    return pricing.currency ? `open | ${pricing.currency}` : "open";
  }

  return pricing.mode;
}

function formatResponseWindow(hours: number | undefined) {
  if (typeof hours !== "number") {
    return "response window not set";
  }

  if (hours <= 0) {
    return "instant";
  }

  return `${hours}h response`;
}

function describeNormalization(
  normalization: RequestMatchingLabWorkflowRun["normalization"]
) {
  switch (normalization.source) {
    case "llm":
      return `llm | ${formatMatchingLabModelLabel(
        normalization.modelId ?? DEFAULT_CHAT_MODEL
      )}`;
    case "heuristic_fallback":
      return `fallback | ${formatMatchingLabModelLabel(
        normalization.modelId ?? DEFAULT_CHAT_MODEL
      )}`;
    default:
      return "heuristic only";
  }
}

function formatMatchingLabModelLabel(modelId: string) {
  const value = modelId.includes("/") ? modelId.split("/")[1] : modelId;
  return value.replace(/-/g, " ");
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatNullableLabel(value: string | null) {
  return value ? formatLabel(value) : "not set";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
