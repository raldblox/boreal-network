"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
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
  AlertTriangleIcon,
  CheckIcon,
  CircleDashedIcon,
  LoaderCircleIcon,
  SparklesIcon,
  SplitIcon,
  XIcon,
} from "lucide-react";
import type {
  RequestFlowGraph,
  RequestFlowNodeDescriptor,
  RequestFlowNodeState,
  RequestFlowNodeTone,
} from "@/lib/request-flow";
import { cn } from "@/lib/utils";

type RequestFlowCanvasProps = {
  graph: RequestFlowGraph;
  className?: string;
  heightClassName?: string;
};

type RequestFlowCanvasNodeData = {
  descriptor: RequestFlowNodeDescriptor;
};

const nodeTypes = {
  requestFlow: RequestFlowCanvasNode,
};

export function RequestFlowCanvas({
  graph,
  className,
  heightClassName = "h-[30rem]",
}: RequestFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <RequestFlowCanvasInner
        className={className}
        graph={graph}
        heightClassName={heightClassName}
      />
    </ReactFlowProvider>
  );
}

function RequestFlowCanvasInner({
  graph,
  className,
  heightClassName,
}: RequestFlowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(graph.initialSelectedNodeId);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<RequestFlowCanvasNodeData>, Edge> | null
  >(null);

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
    [graph.nodes, selectedNodeId]
  );

  const builtEdges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        type: "smoothstep",
        animated: false,
        selectable: false,
        focusable: false,
        style: {
          stroke: "rgba(148, 163, 184, 0.58)",
          strokeWidth: 2.1,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        },
      })) satisfies Edge[],
    [graph.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RequestFlowCanvasNodeData>>(
    []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes((currentNodes) =>
      mergeNodes({
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
    if (!graph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(graph.initialSelectedNodeId);
    }
  }, [graph.initialSelectedNodeId, graph.nodes, selectedNodeId]);

  useEffect(() => {
    if (!flowInstance) {
      return;
    }

    const handle = window.setTimeout(() => {
      flowInstance.fitView({
        duration: 280,
        maxZoom: 1,
        padding: 0.14,
      });
    }, 30);

    return () => window.clearTimeout(handle);
  }, [flowInstance, graph.edges.length, graph.nodes.length]);

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "overflow-hidden rounded-[20px] border border-border/60 bg-[#0b0b0f]",
          heightClassName
        )}
      >
        <ReactFlow
          className="[&_.react-flow__pane]:cursor-grab [&_.react-flow__pane.dragging]:cursor-grabbing"
          colorMode="dark"
          defaultEdgeOptions={{
            type: "smoothstep",
            style: {
              stroke: "rgba(148, 163, 184, 0.58)",
              strokeWidth: 2.1,
            },
          }}
          edges={edges}
          fitView
          maxZoom={1.25}
          minZoom={0.45}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesConnectable={false}
          onEdgesChange={onEdgesChange}
          onInit={setFlowInstance}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onNodesChange={onNodesChange}
          panOnDrag
          panOnScroll
          proOptions={{ hideAttribution: true }}
          selectionOnDrag={false}
        >
          <Background
            color="rgba(148, 163, 184, 0.16)"
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
      </div>
    </div>
  );
}

function RequestFlowCanvasNode({
  data,
  selected,
}: NodeProps<Node<RequestFlowCanvasNodeData>>) {
  const descriptor = data.descriptor;
  const tone = getToneStyles(descriptor.tone);

  return (
    <div className="relative">
      <Handle
        className={cn(
          "!size-2.5 !border-2 !border-[#0b0b0f] shadow-[0_0_0_4px_rgba(11,11,15,0.72)]",
          tone.handle
        )}
        position={Position.Left}
        type="target"
      />
      <Handle
        className={cn(
          "!size-2.5 !border-2 !border-[#0b0b0f] shadow-[0_0_0_4px_rgba(11,11,15,0.72)]",
          tone.handle
        )}
        position={Position.Right}
        type="source"
      />

      <div
        className={cn(
          "relative h-[14.5rem] overflow-hidden rounded-[18px] border bg-[#111217]/94 p-4 text-zinc-100 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.72)] backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
          selected
            ? "border-white/22 shadow-[0_36px_90px_-40px_rgba(0,0,0,0.86)]"
            : "border-white/8 hover:border-white/14"
        )}
        style={{
          width: descriptor.width,
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                    tone.badge
                  )}
                >
                  {descriptor.laneLabel}
                </div>
              </div>

              <div className="mt-3 flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-[13px] border border-white/8",
                    tone.icon
                  )}
                >
                  {getNodeIcon(descriptor)}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium leading-5.5 text-zinc-50">
                    <ClampedText lines={2}>{descriptor.title}</ClampedText>
                  </div>
                  <div className="mt-0.5 text-[12px] leading-5 text-zinc-400">
                    <ClampedText lines={1}>{descriptor.subtitle}</ClampedText>
                  </div>
                </div>
              </div>
            </div>

            <NodeStatePill state={descriptor.state} />
          </div>

          <div className="mt-4 h-px bg-white/6" />

          <div className="flex min-h-0 flex-1 items-center py-3 text-[13px] leading-6 text-zinc-100">
            <ClampedText lines={4}>{descriptor.summary}</ClampedText>
          </div>

          {descriptor.chips.length > 0 ? (
            <div className="flex min-h-7 flex-wrap content-end gap-1.5">
              {descriptor.chips.map((chip) => (
                <span
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400"
                  key={`${descriptor.id}:${chip}`}
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : (
            <div className="min-h-7" />
          )}
        </div>
      </div>
    </div>
  );
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
      className="overflow-hidden"
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

function NodeStatePill({ state }: { state: RequestFlowNodeState }) {
  const {
    label,
    className,
  } = getStateStyles(state);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        className
      )}
    >
      {label}
    </div>
  );
}

function getNodeIcon(descriptor: RequestFlowNodeDescriptor) {
  switch (descriptor.kind) {
    case "request":
      return <SparklesIcon className="size-4" />;
    case "phase":
    case "stage":
      return <SplitIcon className="size-4" />;
    case "worker":
      return <CircleDashedIcon className="size-4" />;
    case "delivery":
    case "step":
      switch (descriptor.state) {
        case "done":
          return <CheckIcon className="size-4" />;
        case "blocked":
          return <AlertTriangleIcon className="size-4" />;
        case "failed":
        case "cancelled":
          return <XIcon className="size-4" />;
        case "current":
          return <LoaderCircleIcon className="size-4" />;
        case "pending":
        default:
          return <CircleDashedIcon className="size-4" />;
      }
  }
}

function getStateStyles(state: RequestFlowNodeState) {
  switch (state) {
    case "done":
      return {
        label: "ready",
        className: "border-emerald-300/24 bg-emerald-300/[0.12] text-emerald-200",
      };
    case "current":
      return {
        label: "active",
        className: "border-sky-300/24 bg-sky-300/[0.12] text-sky-200",
      };
    case "blocked":
      return {
        label: "needs input",
        className: "border-amber-300/24 bg-amber-300/[0.12] text-amber-200",
      };
    case "failed":
      return {
        label: "failed",
        className: "border-rose-300/24 bg-rose-300/[0.12] text-rose-200",
      };
    case "cancelled":
      return {
        label: "cancelled",
        className: "border-violet-300/24 bg-violet-300/[0.12] text-violet-200",
      };
    case "pending":
    default:
      return {
        label: "waiting",
        className: "border-zinc-300/18 bg-white/[0.03] text-zinc-300",
      };
  }
}

function getToneStyles(tone: RequestFlowNodeTone) {
  switch (tone) {
    case "green":
      return {
        badge: "border-emerald-300/24 bg-emerald-300/[0.12] text-emerald-200",
        icon: "bg-emerald-200/92 text-emerald-950",
        surface:
          "from-emerald-300/[0.12] via-emerald-300/[0.04] to-transparent",
        handle: "!bg-emerald-200",
      };
    case "amber":
      return {
        badge: "border-amber-300/24 bg-amber-300/[0.12] text-amber-200",
        icon: "bg-amber-200/92 text-amber-950",
        surface:
          "from-amber-300/[0.12] via-amber-300/[0.04] to-transparent",
        handle: "!bg-amber-200",
      };
    case "blue":
      return {
        badge: "border-sky-300/24 bg-sky-300/[0.12] text-sky-200",
        icon: "bg-sky-200/92 text-sky-950",
        surface: "from-sky-300/[0.12] via-sky-300/[0.04] to-transparent",
        handle: "!bg-sky-200",
      };
    case "pink":
      return {
        badge: "border-pink-300/24 bg-pink-300/[0.12] text-pink-200",
        icon: "bg-pink-200/92 text-pink-950",
        surface:
          "from-pink-300/[0.12] via-pink-300/[0.04] to-transparent",
        handle: "!bg-pink-200",
      };
    case "violet":
    default:
      return {
        badge: "border-violet-300/24 bg-violet-300/[0.12] text-violet-200",
        icon: "bg-violet-200/92 text-violet-950",
        surface:
          "from-violet-300/[0.12] via-violet-300/[0.04] to-transparent",
        handle: "!bg-violet-200",
      };
  }
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
  const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node] as const));

  return nextNodes.map((nextNode) => {
    const currentNode = currentNodeMap.get(nextNode.id);
    if (!currentNode) {
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
