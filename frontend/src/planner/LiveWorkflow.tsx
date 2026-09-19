import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getWebSocketUrl, WorkflowNodeData, WorkflowEdgeData } from '../api/client';
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
  Building2,
  FolderInput,
  Loader2,
  Sun,
  Moon,
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
  const {
    selectedProjectId = 1,
    selectedProjectName,
    setProject,
  } = useProjectStore();
  const navigate = useNavigate();

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
    staleTime: 60000,
  });

  const projects = projectsData?.projects || [
    { id: 1, name: 'Numaligarh Refinery Expansion (Unit 3 & Offsites)', activity_count: 36 },
    { id: 2, name: 'Duliajan Central Gas Gathering Station (CGGS-2)', activity_count: 22 },
    { id: 3, name: 'Guwahati-Siliguri Pipeline Modernization (Phase II)', activity_count: 18 },
  ];

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

  // Theme state: dark and light mode (DEFAULT: light/white)
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('schedulesync_network_theme');
      if (saved) return saved === 'dark';
    }
    return false; // Default white (light mode)
  });

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('schedulesync_network_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  }, []);

  // Fetch initial graph data from FastAPI backend with 30s stale cache for blazing responsiveness
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['live-workflow-graph', selectedProjectId, selectedDiscipline],
    queryFn: () =>
      api.getWorkflowGraph(
        selectedProjectId,
        selectedDiscipline !== 'ALL' ? selectedDiscipline : undefined
      ),
    staleTime: 30000,
  });

  // Local live updated nodes
  const [liveNodes, setLiveNodes] = useState<WorkflowNodeData[]>([]);

  useEffect(() => {
    if (graphData?.nodes !== undefined) {
      setLiveNodes(graphData.nodes);
    }
  }, [graphData]);

  // Connection state: 'live_ws' | 'live_http'
  const [connectionMode, setConnectionMode] = useState<'live_ws' | 'live_http'>('live_http');

  // WebSocket connection to /workflow/ws/{project_id} with resilient HTTP fallback
  useEffect(() => {
    let socket: WebSocket | null = null;
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let probeTimer: ReturnType<typeof setTimeout> | null = null;

    const startHttpFallback = () => {
      if (isMounted) {
        setConnectionMode('live_http');
      }

      // Run immediate poll
      const runPoll = async () => {
        if (!isMounted) return;
        try {
          const res = await api.getWorkflowGraph(selectedProjectId);
          if (res?.nodes && isMounted && res.nodes.length > 0) {
            setLiveNodes(res.nodes);
          }
        } catch {}
      };
      runPoll();

      if (!pollInterval && isMounted) {
        pollInterval = setInterval(runPoll, 6000);
      }
    };

    const connectWs = () => {
      if (!isMounted) return;
      const wsUrl = getWebSocketUrl(`/workflow/ws/${selectedProjectId}`);
      if (!wsUrl) {
        startHttpFallback();
        return;
      }

      try {
        socket = new WebSocket(wsUrl);

        // 1500ms watchdog probe: if handshake hangs on edge/static hosting without WS
        probeTimer = setTimeout(() => {
          if (!isMounted) return;
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            try { socket?.close(); } catch {}
            socket = null;
            setWsConnected(false);
            startHttpFallback();
          }
        }, 1500);

        socket.onopen = () => {
          if (probeTimer) clearTimeout(probeTimer);
          if (!isMounted) return;
          setWsConnected(true);
          setConnectionMode('live_ws');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
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
          if (probeTimer) clearTimeout(probeTimer);
          if (!isMounted) return;
          setWsConnected(false);
          startHttpFallback();
        };

        socket.onerror = () => {
          if (probeTimer) clearTimeout(probeTimer);
          if (!isMounted) return;
          setWsConnected(false);
          startHttpFallback();
        };
      } catch {
        if (probeTimer) clearTimeout(probeTimer);
        if (!isMounted) return;
        setWsConnected(false);
        startHttpFallback();
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (probeTimer) clearTimeout(probeTimer);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
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
      } ${
        isDarkTheme ? 'bg-[#0C0C0D] text-[#F7F7F5]' : 'bg-[#F8FAFC] text-[#0F172A]'
      } overflow-hidden select-none font-sans`}
    >
      {/* ================================================================== */}
      {/* TOP CONTROL BAR                                                    */}
      {/* ================================================================== */}
      <div
        className={`min-h-12 px-3 py-1.5 ${
          isDarkTheme ? 'bg-[#141417] border-[#2A2A30]' : 'bg-white border-[#E2E8F0] shadow-xs'
        } border-b flex items-center justify-between gap-3 z-30 flex-shrink-0 flex-nowrap`}
      >
        {/* Left: Project Selector, Critical Path toggle & Discipline Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          {/* Prominent Project Selector */}
          <div
            className={`flex items-center gap-1.5 ${
              isDarkTheme
                ? 'bg-[#1B1B1F] border-[#2A2A30] text-[#F7F7F5]'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#0F172A]'
            } border hover:border-[#8E8E96] transition-colors rounded-lg px-2.5 py-1 text-xs flex-shrink-0 shadow-xs`}
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E0242B] hidden md:inline flex-shrink-0">
              PROJECT:
            </span>
            <Building2 className="w-3.5 h-3.5 text-[#E0242B] flex-shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const pid = Number(e.target.value);
                const p = projects.find((x) => x.id === pid);
                if (p) {
                  setProject({
                    id: p.id,
                    name: p.name,
                    client: (p as any).client,
                    activity_count: p.activity_count ?? 0,
                  });
                }
              }}
              className={`bg-transparent text-xs font-bold ${
                isDarkTheme ? 'text-[#F7F7F5]' : 'text-[#0F172A]'
              } outline-none cursor-pointer max-w-[190px] sm:max-w-[280px] md:max-w-[360px] truncate`}
              title="Active Project Live Workflow — Switch Project"
            >
              {projects.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className={isDarkTheme ? 'bg-[#141417] text-[#F7F7F5]' : 'bg-white text-slate-800'}
                >
                  {p.name} {p.activity_count !== undefined ? `(${p.activity_count} act)` : ''}
                </option>
              ))}
            </select>
            <span
              className={`hidden xl:inline text-[10px] font-mono font-bold ${
                isDarkTheme ? 'text-[#8E8E96] bg-[#2A2A30]/80' : 'text-slate-600 bg-slate-200'
              } px-1.5 py-0.2 rounded`}
            >
              OIL INDIA
            </span>
          </div>

          <div
            className={`w-px h-4 ${
              isDarkTheme ? 'bg-[#2A2A30]' : 'bg-slate-300'
            } mx-0.5 hidden sm:block`}
          />

          {/* Critical Path Toggle */}
          <button
            onClick={() => setCriticalPathOnly(!criticalPathOnly)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              criticalPathOnly
                ? 'bg-[#E0242B] text-white border-[#E0242B] shadow-md shadow-red-950/60'
                : isDarkTheme
                ? 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
                : 'bg-white text-slate-600 hover:text-slate-900 border-[#CBD5E1]'
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
                  ? isDarkTheme
                    ? 'bg-[#F7F7F5] text-[#0C0C0D] border-[#F7F7F5] font-semibold'
                    : 'bg-[#0F172A] text-white border-[#0F172A] font-semibold shadow-xs'
                  : isDarkTheme
                  ? 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-[#CBD5E1]'
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
                      ? isDarkTheme
                        ? 'bg-[#F7F7F5] text-[#0C0C0D] border-[#F7F7F5] font-semibold'
                        : 'bg-[#0F172A] text-white border-[#0F172A] font-semibold shadow-xs'
                      : isDarkTheme
                      ? 'bg-transparent text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-[#CBD5E1]'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Theme Toggle, Search, Zoom Controls & WebSocket Live Beacon */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* Theme Mode Toggle (Default: Light / White) */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isDarkTheme
                ? 'bg-[#1B1B1F] border-[#2A2A30] text-[#F7F7F5] hover:border-[#8E8E96]'
                : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:border-slate-400 shadow-xs'
            }`}
            title={`Switch to ${isDarkTheme ? 'Light (White)' : 'Dark'} Mode`}
          >
            {isDarkTheme ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">Dark</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden lg:inline text-[11px]">Light (White)</span>
              </>
            )}
          </button>

          {/* Search Box */}
          <div className="relative w-44 sm:w-56">
            <Search
              className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              placeholder="Activity, supervisor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-8 pr-2.5 py-1 rounded-md outline-none border transition-colors ${
                isDarkTheme
                  ? 'bg-[#1B1B1F] border-[#2A2A30] text-[#F7F7F5] placeholder:text-[#8E8E96] focus:border-[#8E8E96]'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] placeholder:text-slate-400 focus:border-slate-500'
              }`}
            />
          </div>

          {/* Zoom Buttons */}
          <div
            className={`flex items-center border rounded-md p-0.5 text-xs ${
              isDarkTheme
                ? 'bg-[#1B1B1F] border-[#2A2A30] text-[#8E8E96]'
                : 'bg-white border-[#CBD5E1] text-slate-600 shadow-xs'
            }`}
          >
            <button
              onClick={zoomOut}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                isDarkTheme
                  ? 'hover:text-[#F7F7F5] hover:bg-[#2A2A30]'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Zoom Out"
            >
              −
            </button>
            <span
              className={`font-mono px-1.5 text-[11px] min-w-[38px] text-center ${
                isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-600'
              }`}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                isDarkTheme
                  ? 'hover:text-[#F7F7F5] hover:bg-[#2A2A30]'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Zoom In"
            >
              +
            </button>
            <div
              className={`w-px h-3 mx-0.5 ${
                isDarkTheme ? 'bg-[#2A2A30]' : 'bg-slate-300'
              }`}
            />
            <button
              onClick={zoomFit}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                isDarkTheme
                  ? 'text-[#8E8E96] hover:text-[#F7F7F5] hover:bg-[#2A2A30]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Fit
            </button>
          </div>

          {/* Live WebSocket & Real-Time Sync Beacon */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border select-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            title={
              connectionMode === 'live_ws'
                ? 'WebSocket stream connected (real-time push)'
                : 'Active real-time schedule sync'
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {connectionMode === 'live_ws' ? 'LIVE FEED' : 'LIVE SYNC'} ({liveNodes.length})
            </span>
          </div>

          {/* Fullscreen Toggle Option */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 border rounded-md transition-colors cursor-pointer flex items-center justify-center ${
              isDarkTheme
                ? 'bg-[#1B1B1F] border-[#2A2A30] text-[#8E8E96] hover:border-[#8E8E96] hover:text-[#F7F7F5]'
                : 'bg-white border-[#CBD5E1] text-slate-600 hover:border-slate-400 hover:text-slate-900 shadow-xs'
            }`}
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
      {isLoading && liveNodes.length === 0 ? (
        <div
          className={`flex-1 flex flex-col items-center justify-center gap-3 ${
            isDarkTheme ? 'bg-[#0C0C0D] text-[#8E8E96]' : 'bg-[#F8FAFC] text-slate-500'
          }`}
        >
          <Loader2 className="w-8 h-8 text-[#E0242B] animate-spin" />
          <span className="text-xs font-mono">Loading live project workflow...</span>
        </div>
      ) : liveNodes.length === 0 ? (
        <div
          className={`flex-1 flex flex-col items-center justify-center p-6 ${
            isDarkTheme ? 'bg-[#0C0C0D] text-[#8E8E96]' : 'bg-[#F8FAFC] text-slate-600'
          }`}
        >
          <div
            className={`max-w-md w-full rounded-2xl p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 border ${
              isDarkTheme
                ? 'bg-[#141417] border-[#2A2A30]'
                : 'bg-white border-[#CBD5E1] shadow-xl'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-[#E0242B]/30 flex items-center justify-center mx-auto text-[#E0242B]">
              <FolderInput className="w-6 h-6" />
            </div>
            <div>
              <h3
                className={`text-base font-bold ${
                  isDarkTheme ? 'text-[#F7F7F5]' : 'text-slate-900'
                }`}
              >
                No Workflow Activities Found
              </h3>
              <p
                className={`text-xs mt-1.5 leading-relaxed ${
                  isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-600'
                }`}
              >
                Project{' '}
                <strong className={isDarkTheme ? 'text-[#F7F7F5]' : 'text-slate-900'}>
                  {selectedProjectName}
                </strong>{' '}
                does not have any baseline schedule activities yet.
              </p>
            </div>
            <button
              onClick={() => navigate('/planner/setup')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E0242B] text-white text-xs font-semibold hover:bg-[#c91e24] transition-colors shadow-md shadow-red-950/50 cursor-pointer"
            >
              <FolderInput className="w-4 h-4" />
              Import Baseline Schedule (.xlsx / .xer)
            </button>
          </div>
        </div>
      ) : (
      <div
        className={`flex-1 flex relative overflow-hidden ${
          isDarkTheme ? 'bg-[#0C0C0D]' : 'bg-[#F8FAFC]'
        }`}
      >
        {/* STICKY LEFT GUTTER (126px) */}
        <div
          ref={gutterRef}
          style={{ width: GUTTER_WIDTH }}
          className={`h-full border-r flex-shrink-0 overflow-hidden z-20 select-none pointer-events-auto ${
            isDarkTheme
              ? 'bg-[#141417] border-[#2A2A30]'
              : 'bg-white border-[#CBD5E1] shadow-xs'
          }`}
        >
          {/* Top ruler corner spacer */}
          <div
            style={{ height: RULER_HEIGHT }}
            className={`w-full border-b flex items-center px-3 text-[10px] font-mono font-semibold tracking-wider uppercase ${
              isDarkTheme
                ? 'bg-[#141417] border-[#2A2A30] text-[#8E8E96]'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-600'
            }`}
          >
            DISCIPLINE
          </div>

          {/* Swimlane Labels */}
          <div className="relative">
            {layout.lanes.map((lane) => (
              <div
                key={lane.id}
                style={{ height: lane.height }}
                className={`w-full px-3 py-2 border-b flex flex-col justify-between ${
                  isDarkTheme
                    ? 'border-[#2A2A30] bg-[#141417]'
                    : 'border-[#CBD5E1] bg-white'
                }`}
              >
                <div className="space-y-0.5">
                  <div
                    className={`text-xs font-semibold truncate leading-tight ${
                      isDarkTheme ? 'text-[#F7F7F5]' : 'text-[#0F172A]'
                    }`}
                  >
                    {lane.label}
                  </div>
                  <div
                    className={`font-mono text-[10px] ${
                      isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-500'
                    }`}
                  >
                    {lane.nodes.length} {lane.nodes.length === 1 ? 'task' : 'tasks'}
                  </div>
                </div>

                <div
                  className={`font-mono text-[9px] truncate ${
                    isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-500'
                  }`}
                >
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
          className={`flex-1 h-full overflow-auto relative custom-scrollbar ${
            isDarkTheme ? 'bg-[#0C0C0D]' : 'bg-[#F8FAFC]'
          }`}
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
              className={`sticky top-0 z-20 border-b flex select-none pointer-events-none ${
                isDarkTheme
                  ? 'bg-[#141417] border-[#2A2A30]'
                  : 'bg-[#F1F5F9] border-[#CBD5E1] shadow-xs'
              }`}
            >
              {timelineColumns.map((w) => (
                <div
                  key={w.id}
                  style={{ width: COL_WIDTH }}
                  className={`h-full border-r px-3 flex items-center justify-between text-xs font-mono relative ${
                    isDarkTheme
                      ? 'border-[#2A2A30] text-[#8E8E96]'
                      : 'border-[#CBD5E1] text-slate-600'
                  }`}
                  title={w.dateRange}
                >
                  <span className="font-semibold truncate">{w.label}</span>
                  <span
                    className={`text-[9px] flex-shrink-0 ml-1 ${
                      isDarkTheme ? 'text-[#5A5A64]' : 'text-slate-400'
                    }`}
                  >
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
                  className={`absolute top-0 bottom-0 border-r ${
                    isDarkTheme ? 'border-[#1B1B1F]' : 'border-[#E2E8F0]'
                  }`}
                />
              ))}

              {/* DATA DATE RED LINE (1px) */}
              {dataDateX !== -1 && (
                <div
                  style={{ left: Math.max(0, dataDateX - GUTTER_WIDTH) }}
                  className="absolute top-0 bottom-0 w-[1px] bg-[#E0242B] z-10 shadow-[0_0_8px_rgba(224,36,43,0.5)] flex flex-col items-center"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#E0242B] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase whitespace-nowrap shadow-md">
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
                  className={`absolute border-b ${
                    isDarkTheme ? 'border-[#2A2A30]' : 'border-[#E2E8F0]'
                  }`}
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
                  <path
                    d="M 0 1.5 L 8 5 L 0 8.5 z"
                    fill={isDarkTheme ? '#3A3A42' : '#94A3B8'}
                  />
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
                      stroke={c.isDriving ? '#E0242B' : isDarkTheme ? '#3A3A42' : '#94A3B8'}
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
                  : isDarkTheme
                  ? '#F7F7F5'
                  : '#0284C7';

                // Provenance / Supervisor status label
                const provenanceDotColor = isComplete
                  ? '#10B981'
                  : isDelayed
                  ? '#E0242B'
                  : isReview
                  ? '#C9942A'
                  : isDarkTheme
                  ? '#F7F7F5'
                  : '#0284C7';

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
                    className={`absolute pointer-events-auto rounded-[6px] text-left p-2.5 transition-all duration-150 cursor-pointer outline-none border select-none ${
                      isDarkTheme ? 'bg-[#141417]' : 'bg-white shadow-xs'
                    } ${
                      isSelected
                        ? isDarkTheme
                          ? 'border-[#F7F7F5] ring-2 ring-[#F7F7F5] shadow-2xl'
                          : 'border-[#0F172A] ring-2 ring-[#0F172A] shadow-xl'
                        : isDelayed
                        ? 'border-[#E0242B]/80 hover:border-[#E0242B]'
                        : isComplete
                        ? isDarkTheme
                          ? 'border-[#10B981]/40 hover:border-[#10B981]'
                          : 'border-[#10B981] hover:border-[#059669]'
                        : isDarkTheme
                        ? 'border-[#2A2A30] hover:border-[#8E8E96]'
                        : 'border-[#CBD5E1] hover:border-slate-400'
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
                          isComplete
                            ? 'text-[#10B981]'
                            : isDarkTheme
                            ? 'text-[#8E8E96]'
                            : 'text-slate-500 font-semibold'
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
                      className={`text-xs font-semibold leading-tight line-clamp-2 pl-1 mb-1 ${
                        isDarkTheme ? 'text-[#F7F7F5]' : 'text-[#0F172A]'
                      }`}
                    >
                      {node.name}
                    </div>

                    {/* Exact Real-Time Schedule Dates */}
                    <div
                      className={`flex items-center justify-between text-[9px] font-mono pl-1 mb-1 ${
                        isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-500'
                      }`}
                    >
                      <span className="truncate">
                        {formatShortDate(node.actual_start || node.planned_start)} → {formatShortDate(node.actual_finish || node.planned_finish)}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isNegativeFloat
                            ? 'text-[#E0242B]'
                            : isComplete
                            ? 'text-[#10B981]'
                            : isDarkTheme
                            ? 'text-[#8E8E96]'
                            : 'text-slate-500'
                        }`}
                      >
                        {floatVal}
                      </span>
                    </div>

                    {/* 2px Progress Bar */}
                    <div
                      className={`w-full rounded-full h-[2px] mb-1.5 overflow-hidden ${
                        isDarkTheme ? 'bg-[#1B1B1F]' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isComplete
                            ? '#10B981'
                            : isDelayed
                            ? '#E0242B'
                            : isDarkTheme
                            ? '#F7F7F5'
                            : '#0284C7',
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
                              : isDarkTheme
                              ? 'text-[#8E8E96]'
                              : 'text-slate-600'
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
                            : isDarkTheme
                            ? 'text-[#8E8E96]'
                            : 'text-slate-500'
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
          <div
            className={`absolute bottom-12 right-6 z-10 px-3 py-2 rounded-lg border shadow-2xl flex items-center gap-2 select-none animate-in slide-in-from-bottom-2 duration-150 ${
              isDarkTheme
                ? 'bg-[#141417] border-[#E0242B]/50'
                : 'bg-white border-[#E0242B] shadow-lg'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#E0242B] animate-ping" />
            <span
              className={`text-xs ${
                isDarkTheme ? 'text-[#8E8E96]' : 'text-slate-600'
              }`}
            >
              Live update:{' '}
              <span
                className={`font-mono font-bold ${
                  isDarkTheme ? 'text-[#F7F7F5]' : 'text-slate-900'
                }`}
              >
                {lastLiveMessage.activity_id}
              </span>{' '}
              is{' '}
              <span className="font-bold text-[#E0242B] uppercase">
                {lastLiveMessage.new_status}
              </span>
            </span>
          </div>
        )}

        {/* Bottom Legend (Brightness encoding, Oil India Red, Green Complete) */}
        <div
          className={`absolute bottom-3 left-6 z-20 flex items-center gap-4 px-4 py-1.5 rounded-full text-xs shadow-xl backdrop-blur-md font-medium select-none border ${
            isDarkTheme
              ? 'bg-[#141417]/95 border-[#2A2A30] text-[#8E8E96]'
              : 'bg-white/95 border-[#CBD5E1] text-slate-700 shadow-md'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isDarkTheme ? 'bg-[#F7F7F5]' : 'bg-slate-700'
              }`}
            />
            <span className={isDarkTheme ? 'text-[#F7F7F5]' : 'text-slate-800'}>In progress</span>
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
          <div
            className={`w-[1px] h-3 mx-1 ${
              isDarkTheme ? 'bg-[#2A2A30]' : 'bg-slate-300'
            }`}
          />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] bg-[#E0242B] inline-block" />
            <span className="text-[#E0242B]">Driving path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3 h-[2px] inline-block ${
                isDarkTheme ? 'bg-[#3A3A42]' : 'bg-[#94A3B8]'
              }`}
            />
            <span>Non-driving link</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
