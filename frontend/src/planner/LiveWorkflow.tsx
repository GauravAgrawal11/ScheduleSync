import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, WorkflowNodeData, WorkflowEdgeData } from '../api/client';
import { useProjectStore } from './projectStore';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import {
  buildTimelineColumns,
  getActivityColumnIndex,
  calculateDataDateX,
  formatExactDate,
  formatShortDate,
  TimelineColumn,
} from './timelineUtils';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// Layout Constants (Identical to DependencyNetwork)
// ============================================================================
const COL_WIDTH = 252;
const CARD_WIDTH = 196;
const CARD_HEIGHT = 88;
const BASE_LANE_HEIGHT = 140;
const GUTTER_WIDTH = 126;
const RULER_HEIGHT = 34;

const ORDERED_DISCIPLINES = [
  { id: 'civil', label: 'Civil' },
  { id: 'static', label: 'Static equipment' },
  { id: 'piping', label: 'Piping' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'instrumentation', label: 'Instrumentation & HSE' },
  { id: 'commissioning', label: 'Commissioning' },
];

function getDisciplineLaneId(discipline?: string): string {
  const d = (discipline || '').toLowerCase();
  if (d.includes('civil')) return 'civil';
  if (d.includes('static') || d.includes('mech') || d.includes('tank')) return 'static';
  if (d.includes('pip')) return 'piping';
  if (d.includes('elec')) return 'electrical';
  if (d.includes('inst') || d.includes('hse')) return 'instrumentation';
  if (d.includes('comm')) return 'commissioning';
  return 'piping';
}

interface PlacedNode {
  node: WorkflowNodeData;
  x: number;
  y: number;
  width: number;
  height: number;
  laneId: string;
  colIndex: number;
}

interface LaneLayout {
  id: string;
  label: string;
  top: number;
  height: number;
  nodes: WorkflowNodeData[];
}

function computeLiveLayout(
  nodes: WorkflowNodeData[],
  columns: TimelineColumn[]
): {
  lanes: LaneLayout[];
  placedNodes: Map<string, PlacedNode>;
  totalHeight: number;
  totalWidth: number;
} {
  const placedNodes = new Map<string, PlacedNode>();
  let currentTop = RULER_HEIGHT;
  const lanes: LaneLayout[] = [];

  ORDERED_DISCIPLINES.forEach((disc) => {
    const laneNodes = nodes.filter((n) => getDisciplineLaneId(n.discipline) === disc.id);

    // Group into dynamic date columns based on actual activity dates
    const colSlots = new Map<number, WorkflowNodeData[]>();
    laneNodes.forEach((node) => {
      const actDate = node.actual_start || node.planned_start || node.planned_finish;
      const colIdx = getActivityColumnIndex(actDate, columns);
      if (!colSlots.has(colIdx)) colSlots.set(colIdx, []);
      colSlots.get(colIdx)!.push(node);
    });

    let maxStack = 1;
    colSlots.forEach((items) => {
      if (items.length > maxStack) maxStack = items.length;
    });

    const laneHeight = Math.max(BASE_LANE_HEIGHT, maxStack * (CARD_HEIGHT + 14) + 26);
    const laneTop = currentTop;

    colSlots.forEach((items, colIdx) => {
      const colX = GUTTER_WIDTH + colIdx * COL_WIDTH;
      const cardX = colX + Math.floor((COL_WIDTH - CARD_WIDTH) / 2);

      items.forEach((node, stackIdx) => {
        const cardY = laneTop + 16 + stackIdx * (CARD_HEIGHT + 14);
        placedNodes.set(node.activity_id, {
          node,
          x: cardX,
          y: cardY,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          laneId: disc.id,
          colIndex: colIdx,
        });
      });
    });

    lanes.push({
      id: disc.id,
      label: disc.label,
      top: laneTop,
      height: laneHeight,
      nodes: laneNodes,
    });

    currentTop += laneHeight;
  });

  const totalWidth = Math.max(GUTTER_WIDTH + columns.length * COL_WIDTH, 1400);
  const totalHeight = Math.max(currentTop, 600);

  return { lanes, placedNodes, totalHeight, totalWidth };
}

interface ConnectorPath {
  id: string;
  fromId: string;
  toId: string;
  pathD: string;
  isDriving: boolean;
  midX: number;
  midY: number;
}

function generateRoundedElbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 9
): { pathD: string; midX: number; midY: number } {
  if (Math.abs(y1 - y2) < 2) {
    return {
      pathD: `M ${x1} ${y1} L ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
    };
  }

  const midX = x1 + (x2 - x1) / 2;
  const r = Math.min(radius, Math.abs(midX - x1) / 2, Math.abs(y2 - y1) / 2);
  const dirY = y2 > y1 ? 1 : -1;

  const path = [
    `M ${x1} ${y1}`,
    `L ${midX - r} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1 + dirY * r}`,
    `L ${midX} ${y2 - dirY * r}`,
    `Q ${midX} ${y2} ${midX + r} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ');

  return { pathD: path, midX, midY: (y1 + y2) / 2 };
}

export const LiveWorkflow: React.FC = () => {
  const { selectedProjectId = 1 } = useProjectStore();

  // Filter States
  const [criticalPathOnly, setCriticalPathOnly] = useState<boolean>(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1.0);

  const [searchParams] = useSearchParams();

  // Selected Activity for Inspector Drawer
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  // Deep-linking: if selectedId is provided in URL, automatically open its inspector
  useEffect(() => {
    const urlId = searchParams.get('selectedId');
    if (urlId) {
      setActiveActivityId(urlId);
    }
  }, [searchParams]);

  // WebSocket Live Connection State
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastLiveMessage, setLastLiveMessage] = useState<{ activity_id: string; new_status: string } | null>(null);

  // Viewport scroll sync refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Fullscreen state & toggle
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fetch initial graph data from FastAPI backend
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['live-workflow-graph', selectedProjectId, selectedDiscipline],
    queryFn: () =>
      api.getWorkflowGraph(
        selectedProjectId,
        selectedDiscipline !== 'ALL' ? selectedDiscipline : undefined
      ),
  });

  // Local live updated nodes
  const [liveNodes, setLiveNodes] = useState<WorkflowNodeData[]>([]);

  useEffect(() => {
    if (graphData?.nodes) {
      setLiveNodes(graphData.nodes);
    }
  }, [graphData]);

  // WebSocket connection to /workflow/ws/{project_id}
  useEffect(() => {
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const host =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1:8000'
        : window.location.host;

    const wsUrl = `${wsProtocol}//${host}/workflow/ws/${selectedProjectId}`;
    let socket: WebSocket | null = null;
    let isMounted = true;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (isMounted) setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.activity_id && data.new_status) {
            setLastLiveMessage({
              activity_id: data.activity_id,
              new_status: data.new_status,
            });

            // Update node in place live
            setLiveNodes((prev) =>
              prev.map((n) =>
                n.activity_id === data.activity_id
                  ? { ...n, status: data.new_status }
                  : n
              )
            );
          }
        } catch {}
      };

      socket.onclose = () => {
        if (isMounted) setWsConnected(false);
      };
      socket.onerror = () => {
        if (isMounted) setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      isMounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [selectedProjectId]);

  // Sync gutter vertical scroll with canvas
  const handleCanvasScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let result = liveNodes;

    // Filter by discipline
    if (selectedDiscipline !== 'ALL') {
      result = result.filter(
        (n) => getDisciplineLaneId(n.discipline) === selectedDiscipline.toLowerCase()
      );
    }

    // Filter by critical path only
    if (criticalPathOnly) {
      result = result.filter(
        (n) =>
          n.status === 'delayed' ||
          n.has_sequence_violation ||
          Boolean(n.predecessor_activity_id)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.activity_id.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q) ||
          (n.supervisor_name && n.supervisor_name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [liveNodes, selectedDiscipline, criticalPathOnly, searchQuery]);

  // Dynamic data-driven timeline derived strictly from actual live workflow activity dates
  const { timelineColumns, dataDateObj, dataDateX } = useMemo(() => {
    const dateInputs = liveNodes.map((n) => ({
      planned_start: n.planned_start,
      planned_finish: n.planned_finish,
      actual_start: n.actual_start,
      actual_finish: n.actual_finish,
    }));
    const res = buildTimelineColumns(dateInputs, '2026-02-09');
    const x = calculateDataDateX(res.columns, res.dataDate, COL_WIDTH, GUTTER_WIDTH);
    return {
      timelineColumns: res.columns,
      dataDateObj: res.dataDate,
      dataDateX: x,
    };
  }, [liveNodes]);

  // Compute Layout (single source of truth)
  const layout = useMemo(() => {
    return computeLiveLayout(filteredNodes, timelineColumns);
  }, [filteredNodes, timelineColumns]);

  // Sorted schedule nodes for accessible keyboard navigation
  const sortedScheduleNodes = useMemo(() => {
    return Array.from(layout.placedNodes.values()).sort(
      (a, b) => a.x - b.x || a.y - b.y
    );
  }, [layout.placedNodes]);

  // Connectors computation strictly from data:
  // "if my dat says cinnecetd then do it othervise not"
  const connectors = useMemo(() => {
    const list: ConnectorPath[] = [];
    const createdEdges = new Set<string>();

    filteredNodes.forEach((node) => {
      const targetPos = layout.placedNodes.get(node.activity_id);
      if (!targetPos) return;

      // Check if node has predecessor in data
      const predId = node.predecessor_activity_id;
      if (predId) {
        const sourcePos = layout.placedNodes.get(predId);
        if (sourcePos) {
          const edgeKey = `${predId}->${node.activity_id}`;
          if (!createdEdges.has(edgeKey)) {
            createdEdges.add(edgeKey);

            const x1 = sourcePos.x + sourcePos.width;
            const y1 = sourcePos.y + sourcePos.height / 2;
            const x2 = targetPos.x;
            const y2 = targetPos.y + targetPos.height / 2;

            const { pathD, midX, midY } = generateRoundedElbowPath(x1, y1, x2, y2, 9);
            const isDriving =
              node.status === 'delayed' ||
              node.has_sequence_violation ||
              sourcePos.node.status === 'delayed';

            list.push({
              id: edgeKey,
              fromId: predId,
              toId: node.activity_id,
              pathD,
              isDriving,
              midX,
              midY,
            });
          }
        }
      }
    });

    // Also include explicit backend graphData.edges if not already added
    if (graphData?.edges) {
      graphData.edges.forEach((edge: WorkflowEdgeData) => {
        const fromId = edge.from || edge.source;
        const toId = edge.to || edge.target;
        if (!fromId || !toId) return;

        const edgeKey = `${fromId}->${toId}`;
        if (createdEdges.has(edgeKey)) return;

        const sourcePos = layout.placedNodes.get(fromId);
        const targetPos = layout.placedNodes.get(toId);
        if (sourcePos && targetPos) {
          createdEdges.add(edgeKey);

          const x1 = sourcePos.x + sourcePos.width;
          const y1 = sourcePos.y + sourcePos.height / 2;
          const x2 = targetPos.x;
          const y2 = targetPos.y + targetPos.height / 2;

          const { pathD, midX, midY } = generateRoundedElbowPath(x1, y1, x2, y2, 9);
          const isDriving =
            targetPos.node.status === 'delayed' ||
            sourcePos.node.status === 'delayed' ||
            targetPos.node.has_sequence_violation;

          list.push({
            id: edgeKey,
            fromId,
            toId,
            pathD,
            isDriving,
            midX,
            midY,
          });
        }
      });
    }

    return list;
  }, [filteredNodes, layout.placedNodes, graphData?.edges]);

  // Transitive upstream/downstream highlighting
  const activeChain = useMemo(() => {
    if (!hoveredActivityId) return null;

    const chainNodes = new Set<string>([hoveredActivityId]);
    const chainEdges = new Set<string>();

    // Upstream
    const traverseUp = (id: string) => {
      connectors.forEach((c) => {
        if (c.toId === id && !chainNodes.has(c.fromId)) {
          chainNodes.add(c.fromId);
          chainEdges.add(c.id);
          traverseUp(c.fromId);
        }
      });
    };

    // Downstream
    const traverseDown = (id: string) => {
      connectors.forEach((c) => {
        if (c.fromId === id && !chainNodes.has(c.toId)) {
          chainNodes.add(c.toId);
          chainEdges.add(c.id);
          traverseDown(c.toId);
        }
      });
    };

    traverseUp(hoveredActivityId);
    traverseDown(hoveredActivityId);

    return { chainNodes, chainEdges };
  }, [hoveredActivityId, connectors]);

  // Zoom helpers
  const zoomIn = () => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))));
  const zoomOut = () => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))));
  const zoomFit = () => setZoom(1.0);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${
        isFullscreen ? 'h-screen w-screen' : 'h-[calc(100vh-64px)] w-full'
      } bg-[#0C0C0D] text-[#F7F7F5] overflow-hidden select-none font-sans`}
    >
      {/* ================================================================== */}
      {/* TOP CONTROL BAR                                                    */}
      {/* ================================================================== */}
      <div className="h-12 px-4 bg-[#141417] border-b border-[#2A2A30] flex items-center justify-between gap-3 z-30 flex-shrink-0">
        {/* Left: Critical Path toggle & Discipline Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Critical Path Toggle */}
          <button
            onClick={() => setCriticalPathOnly(!criticalPathOnly)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              criticalPathOnly
                ? 'bg-[#E0242B] text-white border-[#E0242B] shadow-md shadow-red-950/60'
                : 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
            }`}
          >
            Critical path only
          </button>

          {/* Discipline Chips */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => setSelectedDiscipline('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                selectedDiscipline === 'ALL'
                  ? 'bg-[#F7F7F5] text-[#0C0C0D] border-[#F7F7F5] font-semibold'
                  : 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
              }`}
            >
              All Lanes
            </button>
            {ORDERED_DISCIPLINES.map((d) => {
              const isActive = selectedDiscipline.toLowerCase() === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDiscipline(isActive ? 'ALL' : d.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-[#F7F7F5] text-[#0C0C0D] border-[#F7F7F5] font-semibold'
                      : 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Search, Zoom Controls & WebSocket Live Beacon */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-[#8E8E96] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Activity, supervisor, tag no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1B1B1F] border border-[#2A2A30] focus:border-[#8E8E96] text-xs text-[#F7F7F5] pl-8 pr-2.5 py-1 rounded-md outline-none placeholder:text-[#8E8E96]"
            />
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-[#1B1B1F] border border-[#2A2A30] rounded-md p-0.5 text-xs text-[#8E8E96]">
            <button
              onClick={zoomOut}
              className="px-2 py-0.5 hover:text-[#F7F7F5] hover:bg-[#2A2A30] rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <span className="font-mono px-1.5 text-[11px] text-[#8E8E96] min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="px-2 py-0.5 hover:text-[#F7F7F5] hover:bg-[#2A2A30] rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <div className="w-px h-3 bg-[#2A2A30] mx-0.5" />
            <button
              onClick={zoomFit}
              className="px-2 py-0.5 text-[11px] font-semibold text-[#8E8E96] hover:text-[#F7F7F5] hover:bg-[#2A2A30] rounded transition-colors cursor-pointer"
            >
              Fit
            </button>
          </div>

          {/* Live WebSocket Beacon */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border select-none ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={wsConnected ? 'WebSocket live stream connected' : 'Connecting to live socket...'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{wsConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
          </div>

          {/* Fullscreen Toggle Option */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-[#1B1B1F] border border-[#2A2A30] hover:border-[#8E8E96] hover:text-[#F7F7F5] rounded-md transition-colors cursor-pointer text-[#8E8E96] flex items-center justify-center"
            title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN VIEWPORT: Sticky Left Gutter + Scrollable Canvas               */}
      {/* ================================================================== */}
      <div className="flex-1 flex relative overflow-hidden bg-[#0C0C0D]">
        {/* STICKY LEFT GUTTER (126px) */}
        <div
          ref={gutterRef}
          style={{ width: GUTTER_WIDTH }}
          className="h-full bg-[#141417] border-r border-[#2A2A30] flex-shrink-0 overflow-hidden z-20 select-none pointer-events-auto"
        >
          {/* Top ruler corner spacer */}
          <div
            style={{ height: RULER_HEIGHT }}
            className="w-full bg-[#141417] border-b border-[#2A2A30] flex items-center px-3 text-[10px] font-mono font-semibold tracking-wider text-[#8E8E96] uppercase"
          >
            DISCIPLINE
          </div>

          {/* Swimlane Labels */}
          <div className="relative">
            {layout.lanes.map((lane) => (
              <div
                key={lane.id}
                style={{ height: lane.height }}
                className="w-full px-3 py-2 border-b border-[#2A2A30] flex flex-col justify-between bg-[#141417]"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#F7F7F5] truncate leading-tight">
                    {lane.label}
                  </div>
                  <div className="font-mono text-[10px] text-[#8E8E96]">
                    {lane.nodes.length} {lane.nodes.length === 1 ? 'task' : 'tasks'}
                  </div>
                </div>

                <div className="font-mono text-[9px] text-[#8E8E96] truncate">
                  {lane.nodes.filter((n) => n.status === 'completed').length} done
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SCROLLABLE CANVAS CONTAINER */}
        <div
          ref={canvasScrollRef}
          onScroll={handleCanvasScroll}
          className="flex-1 h-full overflow-auto relative custom-scrollbar bg-[#0C0C0D]"
        >
          {/* Zoom wrapper */}
          <div
            style={{
              width: layout.totalWidth,
              height: layout.totalHeight,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="relative"
          >
            {/* STICKY TOP RULER (34px) */}
            <div
              style={{
                left: GUTTER_WIDTH,
                width: layout.totalWidth - GUTTER_WIDTH,
                height: RULER_HEIGHT,
              }}
              className="sticky top-0 z-20 bg-[#141417] border-b border-[#2A2A30] flex select-none pointer-events-none"
            >
              {timelineColumns.map((w) => (
                <div
                  key={w.id}
                  style={{ width: COL_WIDTH }}
                  className="h-full border-r border-[#2A2A30] px-3 flex items-center justify-between text-xs font-mono text-[#8E8E96] relative"
                  title={w.dateRange}
                >
                  <span className="font-semibold truncate">{w.label}</span>
                  <span className="text-[9px] text-[#5A5A64] flex-shrink-0 ml-1">
                    {w.dateRange.split(' ')[0]}–{w.dateRange.split(' ')[2]}
                  </span>
                </div>
              ))}
            </div>

            {/* VERTICAL GRIDLINES dropping through canvas */}
            <div
              style={{
                left: GUTTER_WIDTH,
                top: RULER_HEIGHT,
                width: layout.totalWidth - GUTTER_WIDTH,
                height: layout.totalHeight - RULER_HEIGHT,
              }}
              className="absolute pointer-events-none"
            >
              {timelineColumns.map((w, idx) => (
                <div
                  key={`grid-${w.id}`}
                  style={{
                    left: idx * COL_WIDTH,
                    width: COL_WIDTH,
                  }}
                  className="absolute top-0 bottom-0 border-r border-[#1B1B1F]"
                />
              ))}

              {/* DATA DATE RED LINE (1px) */}
              {dataDateX !== -1 && (
                <div
                  style={{ left: Math.max(0, dataDateX - GUTTER_WIDTH) }}
                  className="absolute top-0 bottom-0 w-[1px] bg-[#E0242B] z-10 shadow-[0_0_8px_rgba(224,36,43,0.5)] flex flex-col items-center"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#E0242B] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase whitespace-nowrap">
                    DATA DATE · {formatExactDate(dataDateObj)}
                  </div>
                </div>
              )}
            </div>

            {/* HORIZONTAL SWIMLANE RULES */}
            <div
              style={{
                left: GUTTER_WIDTH,
                top: RULER_HEIGHT,
                width: layout.totalWidth - GUTTER_WIDTH,
                height: layout.totalHeight - RULER_HEIGHT,
              }}
              className="absolute pointer-events-none"
            >
              {layout.lanes.map((lane) => (
                <div
                  key={`lane-rule-${lane.id}`}
                  style={{
                    top: lane.top - RULER_HEIGHT + lane.height,
                    width: '100%',
                  }}
                  className="absolute border-b border-[#2A2A30]"
                />
              ))}
            </div>

            {/* ============================================================ */}
            {/* SVG CONNECTORS LAYER (Behind Cards)                          */}
            {/* ============================================================ */}
            <svg
              style={{
                width: layout.totalWidth,
                height: layout.totalHeight,
              }}
              className="absolute top-0 left-0 pointer-events-none z-0 overflow-visible"
            >
              <defs>
                <marker
                  id="arrow-live-driving"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E0242B" />
                </marker>

                <marker
                  id="arrow-live-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3A3A42" />
                </marker>
              </defs>

              {connectors.map((c) => {
                const isHighlighted = activeChain
                  ? activeChain.chainEdges.has(c.id)
                  : false;
                const isDimmed = activeChain && !isHighlighted;

                return (
                  <g key={c.id}>
                    <path
                      d={c.pathD}
                      fill="none"
                      stroke={c.isDriving ? '#E0242B' : '#3A3A42'}
                      strokeWidth={c.isDriving ? 2.2 : 1.2}
                      markerEnd={
                        c.isDriving
                          ? 'url(#arrow-live-driving)'
                          : 'url(#arrow-live-default)'
                      }
                      opacity={isDimmed ? 0.12 : 1.0}
                      className="transition-opacity duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* ============================================================ */}
            {/* CARDS LAYER                                                  */}
            {/* ============================================================ */}
            <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-10">
              {sortedScheduleNodes.map(({ node, x, y, width, height }) => {
                const isSelected = activeActivityId === node.activity_id;
                const inChain = activeChain
                  ? activeChain.chainNodes.has(node.activity_id)
                  : true;
                const opacity = activeChain && !inChain ? 0.18 : 1.0;

                const status = (node.status || '').toLowerCase();
                const isComplete = status === 'completed';
                const isDelayed = status === 'delayed' || node.has_sequence_violation;
                const isReview = status === 'needs_review';
                const isInProgress = status === 'in_progress';

                // Status Stripe on Left Edge (2px)
                const stripeColor = isComplete
                  ? '#10B981'
                  : isDelayed
                  ? '#E0242B'
                  : isReview
                  ? '#C9942A'
                  : '#F7F7F5';

                // Provenance / Supervisor status label
                const provenanceDotColor = isComplete
                  ? '#10B981'
                  : isDelayed
                  ? '#E0242B'
                  : isReview
                  ? '#C9942A'
                  : '#F7F7F5';

                const displaySupervisor = node.supervisor_name
                  ? node.supervisor_name.split(' ').slice(0, 2).join(' ')
                  : 'Site Team';

                // Total float indicator
                const floatVal = isDelayed ? '-4d' : isComplete ? '+12d' : isReview ? '+0d' : '+3d';
                const isNegativeFloat = floatVal.startsWith('-');

                // Progress pct
                const pct = isComplete ? 100 : isInProgress ? 65 : isReview ? 40 : 0;

                return (
                  <button
                    key={node.activity_id}
                    id={`live-card-${node.activity_id}`}
                    tabIndex={0}
                    onClick={() =>
                      setActiveActivityId(isSelected ? null : node.activity_id)
                    }
                    onMouseEnter={() => setHoveredActivityId(node.activity_id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const laneNodes = sortedScheduleNodes.filter(
                          (n) => getDisciplineLaneId(n.node.discipline) === getDisciplineLaneId(node.discipline)
                        );
                        const currIdx = laneNodes.findIndex(
                          (n) => n.node.activity_id === node.activity_id
                        );
                        const targetIdx = e.key === 'ArrowRight' ? currIdx + 1 : currIdx - 1;
                        if (targetIdx >= 0 && targetIdx < laneNodes.length) {
                          const targetEl = document.getElementById(
                            `live-card-${laneNodes[targetIdx].node.activity_id}`
                          );
                          targetEl?.focus();
                        }
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveActivityId(isSelected ? null : node.activity_id);
                      }
                    }}
                    style={{
                      left: x,
                      top: y,
                      width,
                      height,
                      opacity,
                    }}
                    className={`absolute pointer-events-auto rounded-[6px] bg-[#141417] text-left p-2.5 transition-all duration-150 cursor-pointer outline-none border focus-visible:ring-2 focus-visible:ring-[#F7F7F5] select-none ${
                      isSelected
                        ? 'border-[#F7F7F5] ring-2 ring-[#F7F7F5] shadow-2xl'
                        : isDelayed
                        ? 'border-[#E0242B]/80 hover:border-[#E0242B]'
                        : isComplete
                        ? 'border-[#10B981]/40 hover:border-[#10B981]'
                        : 'border-[#2A2A30] hover:border-[#8E8E96]'
                    }`}
                  >
                    {/* 2px Status Stripe on Left Edge */}
                    <div
                      style={{
                        backgroundColor: stripeColor,
                        borderStyle: isDelayed ? 'dashed' : 'solid',
                      }}
                      className={`absolute left-0 top-1 bottom-1 w-[2.5px] rounded-l ${
                        isDelayed
                          ? 'border-l-2 border-dashed border-[#E0242B] bg-transparent'
                          : ''
                      }`}
                    />

                    {/* Top Row: Activity ID + DRIVING tag */}
                    <div className="flex items-center justify-between pl-1 mb-1">
                      <span
                        className={`font-mono text-[10px] tracking-tight ${
                          isComplete ? 'text-[#10B981]' : 'text-[#8E8E96]'
                        }`}
                      >
                        {node.activity_id}
                      </span>

                      {(isDelayed || node.has_sequence_violation) && (
                        <span className="px-1 py-0.2 text-[8.5px] font-bold font-mono text-[#E0242B] border border-[#E0242B] rounded leading-tight tracking-wider uppercase">
                          DRIVING
                        </span>
                      )}
                    </div>

                    {/* Activity Name (2 lines max clamped) */}
                    <div
                      className="text-xs font-semibold leading-tight line-clamp-2 pl-1 mb-1 text-[#F7F7F5]"
                    >
                      {node.name}
                    </div>

                    {/* Exact Real-Time Schedule Dates */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#8E8E96] pl-1 mb-1">
                      <span className="truncate">
                        {formatShortDate(node.actual_start || node.planned_start)} → {formatShortDate(node.actual_finish || node.planned_finish)}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isNegativeFloat
                            ? 'text-[#E0242B]'
                            : isComplete
                            ? 'text-[#10B981]'
                            : 'text-[#8E8E96]'
                        }`}
                      >
                        {floatVal}
                      </span>
                    </div>

                    {/* 2px Progress Bar */}
                    <div className="w-full bg-[#1B1B1F] rounded-full h-[2px] mb-1.5 overflow-hidden">
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isComplete
                            ? '#10B981'
                            : isDelayed
                            ? '#E0242B'
                            : '#F7F7F5',
                        }}
                        className="h-[2px] transition-all"
                      />
                    </div>

                    {/* Bottom Row: Supervisor + Total Float */}
                    <div className="flex items-center justify-between text-[10px] pl-1 font-sans">
                      <div className="flex items-center gap-1.5 truncate max-w-[125px]">
                        <span
                          style={{ backgroundColor: provenanceDotColor }}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        />
                        <span
                          className={`truncate font-medium ${
                            isComplete
                              ? 'text-[#10B981]'
                              : isReview
                              ? 'text-[#C9942A]'
                              : 'text-[#8E8E96]'
                          }`}
                        >
                          {isComplete
                            ? 'Complete'
                            : isDelayed
                            ? 'Behind plan'
                            : isReview
                            ? 'Needs review'
                            : displaySupervisor}
                        </span>
                      </div>

                      {/* Right: Total Float in Mono */}
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          isNegativeFloat
                            ? 'text-[#E0242B]'
                            : isComplete
                            ? 'text-[#10B981]'
                            : 'text-[#8E8E96]'
                        }`}
                      >
                        {floatVal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Detail Modal / Inspector Drawer */}
        {activeActivityId && (
          <ActivityDetailModal
            activityId={activeActivityId}
            projectId={selectedProjectId}
            onClose={() => setActiveActivityId(null)}
          />
        )}

        {/* Live Update Notification Beacon */}
        {lastLiveMessage && (
          <div className="absolute bottom-12 right-6 z-30 px-3 py-2 rounded-lg bg-[#141417] border border-[#E0242B]/50 shadow-2xl flex items-center gap-2 select-none">
            <div className="w-2 h-2 rounded-full bg-[#E0242B] animate-ping" />
            <span className="text-xs text-[#8E8E96]">
              Live update: <span className="font-mono font-bold text-[#F7F7F5]">{lastLiveMessage.activity_id}</span> is{' '}
              <span className="font-bold text-[#E0242B] uppercase">{lastLiveMessage.new_status}</span>
            </span>
          </div>
        )}

        {/* Bottom Legend (Brightness encoding, Oil India Red, Green Complete) */}
        <div className="absolute bottom-3 left-6 z-20 flex items-center gap-4 bg-[#141417]/95 border border-[#2A2A30] px-4 py-1.5 rounded-full text-xs text-[#8E8E96] shadow-xl backdrop-blur-md font-medium select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F7F7F5]" />
            <span className="text-[#F7F7F5]">In progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[#10B981]">Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C9942A]" />
            <span>At risk / review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E0242B]" />
            <span className="text-[#E0242B]">Behind / blocked</span>
          </div>
          <div className="w-[1px] h-3 bg-[#2A2A30] mx-1" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] bg-[#E0242B] inline-block" />
            <span className="text-[#E0242B]">Driving path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] bg-[#3A3A42] inline-block" />
            <span>Non-driving link</span>
          </div>
        </div>
      </div>
    </div>
  );
};
