"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RequestProcessCard,
  type RequestProcessCardIconKind,
  type RequestProcessCardItem,
  type RequestProcessCardTag,
  type RequestProcessCardTone,
} from "@/components/chat/request-process-card";
import type {
  RequestFlowGraph,
  RequestFlowNodeDescriptor,
  RequestFlowNodeKind,
  RequestFlowNodeState,
  RequestFlowNodeTone,
} from "@/lib/request-flow";
import { cn } from "@/lib/utils";

type RequestFlowCanvasProps = {
  graph: RequestFlowGraph;
  className?: string;
  heightClassName?: string;
  onSelectedNodeChange?: (nodeId: string) => void;
  selectedNodeId?: string;
};

type RequestFlowCanvasNodeData = {
  descriptor: RequestFlowNodeDescriptor;
};

type PendingWorkflowAction = {
  sourceId: string;
  x: number;
  y: number;
};

const nodeTypes = {
  requestFlow: RequestFlowCanvasNode,
};
const NODE_HANDLE_TOP = "4.25rem";

export function RequestFlowCanvas({
  graph,
  className,
  heightClassName = "h-[30rem]",
  onSelectedNodeChange,
  selectedNodeId,
}: RequestFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <RequestFlowCanvasInner
        className={className}
        graph={graph}
        heightClassName={heightClassName}
        onSelectedNodeChange={onSelectedNodeChange}
        selectedNodeId={selectedNodeId}
      />
    </ReactFlowProvider>
  );
}

function RequestFlowCanvasInner({
  graph,
  className,
  heightClassName,
  onSelectedNodeChange,
  selectedNodeId: selectedNodeIdProp,
}: RequestFlowCanvasProps) {
  const [uncontrolledSelectedNodeId, setUncontrolledSelectedNodeId] = useState(
    graph.initialSelectedNodeId,
  );
  const selectedNodeId = selectedNodeIdProp ?? uncontrolledSelectedNodeId;
  const canvasRef = useRef<HTMLElement>(null);
  const connectingSourceNodeIdRef = useRef<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingWorkflowAction | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    Node<RequestFlowCanvasNodeData>,
    Edge
  > | null>(null);
  const graphViewportKey = `${graph.nodes.length}:${graph.edges.length}`;

  const builtNodes = useMemo(
    () =>
      graph.nodes.map((descriptor) => ({
        id: descriptor.id,
        type: "requestFlow",
        position: descriptor.position,
        data: {
          descriptor,
        },
        selected: descriptor.id === selectedNodeId,
        draggable: true,
        selectable: true,
      })) satisfies Array<Node<RequestFlowCanvasNodeData>>,
    [graph.nodes, selectedNodeId],
  );

  const builtEdges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        type: "bezier",
        animated: false,
        selectable: false,
        focusable: false,
        style: {
          stroke: "rgba(52, 211, 153, 0.72)",
          strokeWidth: 2,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        },
      })) satisfies Edge[],
    [graph.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<
    Node<RequestFlowCanvasNodeData>
  >([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const handleNodesChange = (
    changes: NodeChange<Node<RequestFlowCanvasNodeData>>[],
  ) => {
    setPendingAction(null);
    onNodesChange(changes);
  };

  useEffect(() => {
    setNodes((currentNodes) =>
      mergeNodes({
        currentNodes,
        nextNodes: builtNodes,
        selectedNodeId,
      }),
    );
  }, [builtNodes, selectedNodeId, setNodes]);

  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  useEffect(() => {
    if (
      selectedNodeIdProp ||
      graph.nodes.some((node) => node.id === selectedNodeId)
    ) {
      return;
    }

    setUncontrolledSelectedNodeId(graph.initialSelectedNodeId);
  }, [
    graph.initialSelectedNodeId,
    graph.nodes,
    selectedNodeId,
    selectedNodeIdProp,
  ]);

  useEffect(() => {
    if (!flowInstance) {
      return;
    }

    void graphViewportKey;
    const handle = window.setTimeout(() => {
      flowInstance.fitView({
        duration: 280,
        maxZoom: 1,
        padding: 0.2,
      });
    }, 30);

    return () => window.clearTimeout(handle);
  }, [flowInstance, graphViewportKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flowInstance) {
      return;
    }

    let resizeHandle: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeHandle !== null) {
        window.clearTimeout(resizeHandle);
      }

      resizeHandle = window.setTimeout(() => {
        flowInstance.fitView({
          duration: 240,
          maxZoom: 1,
          padding: 0.2,
        });
      }, 80);
    });

    resizeObserver.observe(canvas);

    return () => {
      if (resizeHandle !== null) {
        window.clearTimeout(resizeHandle);
      }

      resizeObserver.disconnect();
    };
  }, [flowInstance]);

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <section
        ref={canvasRef}
        aria-label="Request workflow canvas"
        className={cn(
          "relative overflow-hidden rounded-[20px] border border-border/60 bg-background",
          heightClassName,
        )}
        style={{
          background:
            "radial-gradient(circle at 18% 0%, color-mix(in oklch, var(--status-success) 16%, transparent), transparent 34rem), radial-gradient(circle at 84% 18%, color-mix(in oklch, var(--status-active) 10%, transparent), transparent 30rem), linear-gradient(135deg, var(--background), color-mix(in oklch, var(--background) 76%, var(--card) 24%))",
        }}
      >
        <ReactFlow
          className="[&_.react-flow__pane]:cursor-grab [&_.react-flow__pane.dragging]:cursor-grabbing"
          colorMode="dark"
          connectOnClick={false}
          connectionLineStyle={{
            stroke: "rgb(34, 197, 94)",
            strokeWidth: 2,
          }}
          connectionLineType={ConnectionLineType.Bezier}
          connectionRadius={42}
          defaultEdgeOptions={{
            type: "bezier",
            style: {
              stroke: "rgba(52, 211, 153, 0.72)",
              strokeWidth: 2,
            },
          }}
          edges={edges}
          fitView
          fitViewOptions={{
            maxZoom: 1,
            padding: 0.2,
          }}
          maxZoom={1.25}
          minZoom={0.45}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesConnectable
          nodesDraggable
          onEdgesChange={onEdgesChange}
          onInit={setFlowInstance}
          onConnectEnd={(event) => {
            const sourceId = connectingSourceNodeIdRef.current;
            connectingSourceNodeIdRef.current = null;
            if (!sourceId || !canvasRef.current) {
              return;
            }

            const point = getClientPoint(event);
            if (!point) {
              return;
            }

            const rect = canvasRef.current.getBoundingClientRect();
            setPendingAction({
              sourceId,
              x: Math.min(
                Math.max(point.clientX - rect.left, 24),
                rect.width - 320,
              ),
              y: Math.min(
                Math.max(point.clientY - rect.top, 24),
                rect.height - 220,
              ),
            });
          }}
          onConnectStart={(_, params) => {
            connectingSourceNodeIdRef.current = params.nodeId;
            setPendingAction(null);
          }}
          onNodeClick={(_, node) => {
            setUncontrolledSelectedNodeId(node.id);
            setPendingAction(null);
            onSelectedNodeChange?.(node.id);
          }}
          onNodesChange={handleNodesChange}
          panOnDrag
          panOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          selectionOnDrag={false}
          style={{ background: "transparent" }}
          zoomOnScroll={false}
        >
          <Background
            color="color-mix(in oklch, var(--muted-foreground) 32%, transparent)"
            gap={28}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls
            aria-label="Workflow viewport controls"
            className="!bottom-4 !left-4 !m-0 overflow-hidden !rounded-[18px] !border !border-border/70 !bg-background/82 !shadow-[0_18px_52px_rgba(0,0,0,0.28)] !backdrop-blur-xl [&_button]:!h-9 [&_button]:!w-9 [&_button]:!border-border/60 [&_button]:!bg-transparent [&_button]:!text-foreground [&_button:hover]:!bg-muted/78 [&_button:focus-visible]:!outline-none [&_button:focus-visible]:!ring-2 [&_button:focus-visible]:!ring-ring [&_svg]:!fill-foreground"
            position="bottom-left"
            showInteractive={false}
          />
        </ReactFlow>
        <p className="sr-only">
          Press and drag open canvas space to move the workflow. Use the
          bottom-left controls to fit, zoom in, or zoom out.
        </p>
        {pendingAction ? (
          <WorkflowActionSearchPanel
            graph={graph}
            onChooseNode={(nodeId) => {
              setUncontrolledSelectedNodeId(nodeId);
              setPendingAction(null);
              onSelectedNodeChange?.(nodeId);
            }}
            onClose={() => setPendingAction(null)}
            pendingAction={pendingAction}
          />
        ) : null}
      </section>
    </div>
  );
}

function RequestFlowCanvasNode({
  data,
  selected,
}: NodeProps<Node<RequestFlowCanvasNodeData>>) {
  const descriptor = data.descriptor;
  const tone = getToneStyles(descriptor.tone);
  const cardTone = getProcessCardTone(descriptor);

  return (
    <div className="relative">
      <Handle
        className={cn(
          "!size-4 !border-2 !border-[#050608] shadow-[0_0_0_4px_rgba(5,6,8,0.72)]",
          tone.handle,
        )}
        isConnectable={false}
        position={Position.Left}
        style={{ top: NODE_HANDLE_TOP }}
        type="target"
      />
      <Handle
        className={cn(
          "!size-4 !border-2 !border-[#050608] shadow-[0_0_0_4px_rgba(5,6,8,0.72)]",
          tone.handle,
        )}
        isConnectable
        position={Position.Right}
        style={{ top: NODE_HANDLE_TOP }}
        type="source"
      />

      <div
        className="relative h-[13.5rem] max-h-[13.5rem] min-h-[13.5rem]"
        style={{
          width: descriptor.width,
        }}
      >
        <RequestProcessCard
          badges={[{ label: descriptor.laneLabel, tone: cardTone }]}
          className="h-full cursor-grab bg-card/96 active:cursor-grabbing"
          density="flow"
          iconKind={getProcessCardIconKind(descriptor)}
          items={getBuyerNodeItems(descriptor)}
          selected={selected}
          status={{
            label:
              descriptor.stateLabel || formatNodeStateLabel(descriptor.state),
            tone: cardTone,
          }}
          subtitle={getBuyerNodeSubtitle(descriptor)}
          summary={getBuyerNodeSummary(descriptor)}
          tags={getBuyerNodeTags(descriptor, cardTone)}
          title={descriptor.title}
        />
      </div>
    </div>
  );
}

function getToneStyles(tone: RequestFlowNodeTone) {
  switch (tone) {
    case "green":
      return {
        handle: "!bg-status-success",
      };
    case "amber":
      return {
        handle: "!bg-status-waiting",
      };
    case "blue":
      return {
        handle: "!bg-status-active",
      };
    case "pink":
      return {
        handle: "!bg-status-delivered",
      };
    default:
      return {
        handle: "!bg-status-waiting",
      };
  }
}

function getProcessCardTone(
  descriptor: RequestFlowNodeDescriptor,
): RequestProcessCardTone {
  switch (descriptor.state) {
    case "blocked":
      return "waiting";
    case "cancelled":
    case "failed":
      return "danger";
    case "current":
      return "active";
    case "done":
      return descriptor.kind === "delivery" ? "delivered" : "success";
    default:
      return mapNodeToneToCardTone(descriptor.tone);
  }
}

function mapNodeToneToCardTone(
  tone: RequestFlowNodeTone,
): RequestProcessCardTone {
  switch (tone) {
    case "amber":
      return "waiting";
    case "blue":
      return "active";
    case "green":
      return "success";
    case "pink":
      return "delivered";
    case "violet":
      return "violet";
    default:
      return "muted";
  }
}

function getProcessCardIconKind(
  descriptor: RequestFlowNodeDescriptor,
): RequestProcessCardIconKind {
  const source = [
    descriptor.kind,
    descriptor.title,
    descriptor.subtitle,
    descriptor.summary,
    ...descriptor.chips,
  ]
    .join(" ")
    .toLowerCase();

  if (descriptor.state === "blocked" || descriptor.state === "failed") {
    return "blocked";
  }

  if (/photo|picture|image|proof|evidence/.test(source)) {
    return "proof";
  }

  if (/onsite|field|local|visit|storefront|location/.test(source)) {
    return "onsite";
  }

  switch (descriptor.kind) {
    case "delivery":
    case "step":
      return descriptor.state === "done" ? "done" : "package";
    case "request":
      return "request";
    case "worker":
      return "package";
    default:
      return "plan";
  }
}

function getBuyerNodeItems(
  descriptor: RequestFlowNodeDescriptor,
): RequestProcessCardItem[] {
  const checklist = descriptor.details.find(
    (detail) => detail.label === "Checklist",
  );

  if (checklist) {
    return fieldValuesToStrings(checklist.value).map((label) => ({ label }));
  }

  return descriptor.details.slice(0, 2).map((detail) => ({
    detail: formatFieldValue(detail.value),
    label: detail.label,
  }));
}

function getBuyerNodeTags(
  descriptor: RequestFlowNodeDescriptor,
  cardTone: RequestProcessCardTone,
): RequestProcessCardTag[] {
  return descriptor.chips.map((chip) => ({
    label: chip,
    tone: /proof|ready|done|completed/i.test(chip) ? cardTone : "muted",
  }));
}

function fieldValuesToStrings(
  value: RequestFlowNodeDescriptor["details"][0]["value"],
) {
  return Array.isArray(value) ? value : [value];
}

function formatFieldValue(
  value: RequestFlowNodeDescriptor["details"][0]["value"],
) {
  return fieldValuesToStrings(value).slice(0, 3).join(", ");
}

function formatNodeStateLabel(state: RequestFlowNodeState) {
  switch (state) {
    case "done":
      return "done";
    case "blocked":
      return "needs input";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "current":
      return "active";
    default:
      return "pending";
  }
}

function getBuyerNodeSubtitle(descriptor: RequestFlowNodeDescriptor) {
  switch (descriptor.kind) {
    case "request":
      return "Request";
    case "phase":
    case "stage":
      return descriptor.subtitle || descriptor.laneLabel;
    case "worker":
      return descriptor.state === "done" ? "Completed work" : "Worker route";
    case "delivery":
    case "step":
      return descriptor.state === "done" ? "Result attached" : "Delivery";
  }
}

function getBuyerNodeSummary(descriptor: RequestFlowNodeDescriptor) {
  if (descriptor.kind === "request") {
    return descriptor.summary;
  }

  if (descriptor.kind === "phase" || descriptor.kind === "stage") {
    return (
      descriptor.summary || "Boreal turns the request into a reusable path."
    );
  }

  if (descriptor.kind === "worker") {
    return descriptor.state === "done"
      ? "The worker lane has finished or supported the accepted delivery."
      : descriptor.summary;
  }

  if (descriptor.kind === "delivery" || descriptor.kind === "step") {
    return descriptor.summary || "The result appears here when it is ready.";
  }

  return descriptor.summary;
}

function WorkflowActionSearchPanel({
  graph,
  onChooseNode,
  onClose,
  pendingAction,
}: {
  graph: RequestFlowGraph;
  onChooseNode: (nodeId: string) => void;
  onClose: () => void;
  pendingAction: PendingWorkflowAction;
}) {
  const sourceNode = graph.nodes.find(
    (node) => node.id === pendingAction.sourceId,
  );
  const options = getWorkflowActionOptions(graph, sourceNode);

  if (!sourceNode || options.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Choose the next workflow step"
      className="nopan absolute z-30 w-[min(22rem,calc(100%-2rem))] overflow-hidden rounded-[18px] border border-white/10 bg-[#111217]/98 text-zinc-100 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      role="dialog"
      style={{
        left: pendingAction.x,
        top: pendingAction.y,
      }}
    >
      <div className="border-b border-white/8 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          Next step
        </div>
        <div className="mt-1 text-[14px] font-medium text-zinc-50">
          After {sourceNode.title}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {options.map((option) => (
          <button
            className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/50"
            key={option.nodeId}
            onClick={() => onChooseNode(option.nodeId)}
            type="button"
          >
            <span className="text-[14px] font-medium text-zinc-50">
              {option.title}
            </span>
            <span className="mt-0.5 text-[12px] leading-5 text-zinc-400">
              {option.description}
            </span>
          </button>
        ))}
      </div>
      <button
        className="absolute right-3 top-3 text-[12px] text-zinc-500 transition-colors hover:text-zinc-100"
        onClick={onClose}
        type="button"
      >
        Close
      </button>
    </div>
  );
}

function getWorkflowActionOptions(
  graph: RequestFlowGraph,
  sourceNode: RequestFlowNodeDescriptor | undefined,
) {
  if (!sourceNode) {
    return [];
  }

  const nextKind = getNextWorkflowKind(sourceNode.kind);
  const candidates = graph.nodes.filter((node) => node.kind === nextKind);

  return candidates.map((node) => ({
    nodeId: node.id,
    title: getWorkflowActionTitle(sourceNode.kind),
    description: node.summary,
  }));
}

function getNextWorkflowKind(kind: RequestFlowNodeKind): RequestFlowNodeKind {
  switch (kind) {
    case "request":
      return "phase";
    case "phase":
    case "stage":
      return "worker";
    case "worker":
      return "delivery";
    case "delivery":
    case "step":
      return "delivery";
  }
}

function getWorkflowActionTitle(sourceKind: RequestFlowNodeKind) {
  switch (sourceKind) {
    case "request":
      return "Open the plan";
    case "phase":
    case "stage":
      return "Choose worker route";
    case "worker":
      return "Review delivery";
    case "delivery":
    case "step":
      return "Inspect result";
  }
}

function getClientPoint(event: MouseEvent | TouchEvent) {
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  }

  if ("clientX" in event) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  return null;
}

function mergeNodes({
  currentNodes,
  nextNodes,
  selectedNodeId,
}: {
  currentNodes: Array<Node<RequestFlowCanvasNodeData>>;
  nextNodes: Array<Node<RequestFlowCanvasNodeData>>;
  selectedNodeId: string;
}) {
  const currentNodeMap = new Map(
    currentNodes.map((node) => [node.id, node] as const),
  );

  return nextNodes.map((nextNode) => {
    const currentNode = currentNodeMap.get(nextNode.id);
    if (!currentNode) {
      return {
        ...nextNode,
        selected: nextNode.id === selectedNodeId,
      };
    }
    const currentDescriptor = currentNode.data.descriptor;
    const nextDescriptor = nextNode.data.descriptor;
    const layoutChanged =
      currentDescriptor.position.x !== nextDescriptor.position.x ||
      currentDescriptor.position.y !== nextDescriptor.position.y;

    return {
      ...nextNode,
      position: layoutChanged ? nextNode.position : currentNode.position,
      selected: nextNode.id === selectedNodeId,
    };
  });
}
