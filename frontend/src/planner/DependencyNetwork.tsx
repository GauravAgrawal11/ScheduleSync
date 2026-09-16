import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Discipline,
  Status,
  Provenance,
  MOCK_NETWORK_ACTIVITIES,
} from '../mock/network';
import { useNetworkStore } from './networkStore';
import { api } from '../api/client';
import { SupervisorLayerCard } from './components/SupervisorLayerCard';
import { SupervisorDetailPanel } from './components/SupervisorDetailPanel';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Check,
  RotateCw,
  ExternalLink,
  ShieldAlert,
  Play,
  Pause,
  Volume2,
  FlaskConical,
  Link2,
  ArrowRight,
  Sliders,
} from 'lucide-react';

// ============================================================================
// Layout Constants & Geometry
// ============================================================================

const COLUMN_WIDTH = 252;
const CARD_WIDTH = 196;
const CARD_HEIGHT = 82;
const BASE_LANE_HEIGHT = 132;
const GUTTER_WIDTH = 126;
const RULER_HEIGHT = 34;

const WEEKS = [
  { id: 'W05', label: 'W05 · 26 Jan' },
  { id: 'W06', label: 'W06 · 02 Feb' },
  { id: 'W07', label: 'W07 · 09 Feb' },
  { id: 'W08', label: 'W08 · 16 Feb' },
  { id: 'W09', label: 'W09 · 23 Feb' },
  { id: 'W10', label: 'W10 · 02 Mar' },
];

const ORDERED_DISCIPLINES: { id: Discipline; label: string }[] = [
  { id: 'civil', label: 'Civil' },
  { id: 'static', label: 'Static equipment' },
  { id: 'piping', label: 'Piping' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'instrumentation', label: 'Instrumentation & HSE' },
  { id: 'commissioning', label: 'Commissioning' },
];

// Data Date is at start of W07 (9 Feb 2026)
const DATA_DATE_X = 2 * COLUMN_WIDTH + 6;

// ============================================================================
// Layout Engine: Single Source of Truth
// ============================================================================

interface PlacedNode {
  activity: Activity;
  x: number;
  y: number;
  width: number;
  height: number;
  laneIndex: number;
  colIndex: number;
}

interface LaneLayout {
  discipline: Discipline;
  label: string;
  top: number;
  height: number;
  activities: Activity[];
  isCollapsed: boolean;
}

function computeLayout(
  activities: Activity[],
  collapsedLanes: Set<Discipline>,
  expandedParents: Set<string>
): {
  lanes: LaneLayout[];
  placedNodes: Map<string, PlacedNode>;
  totalHeight: number;
  totalWidth: number;
} {
  const placedNodes = new Map<string, PlacedNode>();
  let currentTop = RULER_HEIGHT;
  const lanes: LaneLayout[] = [];

  ORDERED_DISCIPLINES.forEach((disc, discIdx) => {
    const laneActivities = activities.filter((a) => a.discipline === disc.id);
    const isCollapsed = collapsedLanes.has(disc.id);

    // Compute slot distribution: colIndex -> list of activities
    const colSlots = new Map<number, Activity[]>();
    laneActivities.forEach((act) => {
      let colIdx = WEEKS.findIndex((w) => w.id === act.scheduledWeek);
      if (colIdx === -1) colIdx = 1;
      if (!colSlots.has(colIdx)) colSlots.set(colIdx, []);
      colSlots.get(colIdx)!.push(act);
    });

    // Find max stack count in this lane
    let maxStack = 1;
    colSlots.forEach((acts) => {
      if (acts.length > maxStack) maxStack = acts.length;
    });

    const laneHeight = isCollapsed
      ? 56
      : Math.max(BASE_LANE_HEIGHT, maxStack * (CARD_HEIGHT + 14) + 26);

    const laneTop = currentTop;

    if (!isCollapsed) {
      colSlots.forEach((acts, colIdx) => {
        acts.forEach((act, stackIdx) => {
          const x = colIdx * COLUMN_WIDTH + 28;
          const y = laneTop + 18 + stackIdx * (CARD_HEIGHT + 14);
          placedNodes.set(act.id, {
            activity: act,
            x,
            y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            laneIndex: discIdx,
            colIndex: colIdx,
          });
        });
      });
    }

    lanes.push({
      discipline: disc.id,
      label: disc.label,
      top: laneTop,
      height: laneHeight,
      activities: laneActivities,
      isCollapsed,
    });

    currentTop += laneHeight;
  });

  const totalWidth = WEEKS.length * COLUMN_WIDTH + 60;
  const totalHeight = currentTop;

  return { lanes, placedNodes, totalHeight, totalWidth };
}

// ============================================================================
// Connector Routing with ~9px Rounded Elbows
// ============================================================================

interface ConnectorPath {
  id: string;
  fromId: string;
  toId: string;
  pathD: string;
  isDriving: boolean;
  type: string;
  lagDays: number;
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
  // Straight line if Y is identical
  if (Math.abs(y1 - y2) < 2) {
    return {
      pathD: `M ${x1} ${y1} L ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: y1,
    };
  }

  const midX = x1 + (x2 - x1) / 2;
  const midY = (y1 + y2) / 2;

  const goingDown = y2 > y1;
  const r = Math.min(radius, Math.abs(midX - x1), Math.abs(y2 - y1) / 2);

  let d = '';

  if (goingDown) {
    // Exit right, turn down, turn right to entry
    d = `M ${x1} ${y1} ` +
      `L ${midX - r} ${y1} ` +
      `Q ${midX} ${y1}, ${midX} ${y1 + r} ` +
      `L ${midX} ${y2 - r} ` +
      `Q ${midX} ${y2}, ${midX + r} ${y2} ` +
      `L ${x2} ${y2}`;
  } else {
    // Exit right, turn up, turn right to entry
    d = `M ${x1} ${y1} ` +
      `L ${midX - r} ${y1} ` +
      `Q ${midX} ${y1}, ${midX} ${y1 - r} ` +
      `L ${midX} ${y2 + r} ` +
      `Q ${midX} ${y2}, ${midX + r} ${y2} ` +
      `L ${x2} ${y2}`;
  }

  return { pathD: d, midX, midY };
}

// ============================================================================
// Transitive Dependency Traversal (Upstream & Downstream)
// ============================================================================

function computeTransitiveChain(
  targetId: string,
  activities: Activity[]
): {
  chainNodes: Set<string>;
  chainEdges: Set<string>;
} {
  const chainNodes = new Set<string>([targetId]);
  const chainEdges = new Set<string>();

  const actMap = new Map<string, Activity>();
  activities.forEach((a) => actMap.set(a.id, a));

  // 1. Upstream (predecessors)
  const upQueue = [targetId];
  const visitedUp = new Set<string>([targetId]);

  while (upQueue.length > 0) {
    const currId = upQueue.shift()!;
    const act = actMap.get(currId);
    if (act) {
      act.predecessors.forEach((pred) => {
        chainNodes.add(pred.id);
        chainEdges.add(`${pred.id}->${currId}`);
        if (!visitedUp.has(pred.id)) {
          visitedUp.add(pred.id);
          upQueue.push(pred.id);
        }
      });
    }
  }

  // 2. Downstream (successors)
  // Build successor map
  const successorMap = new Map<string, string[]>();
  activities.forEach((a) => {
    a.predecessors.forEach((p) => {
      if (!successorMap.has(p.id)) successorMap.set(p.id, []);
      successorMap.get(p.id)!.push(a.id);
    });
  });

  const downQueue = [targetId];
  const visitedDown = new Set<string>([targetId]);

  while (downQueue.length > 0) {
    const currId = downQueue.shift()!;
    const successors = successorMap.get(currId) || [];
    successors.forEach((succId) => {
      chainNodes.add(succId);
      chainEdges.add(`${currId}->${succId}`);
      if (!visitedDown.has(succId)) {
        visitedDown.add(succId);
        downQueue.push(succId);
      }
    });
  }

  return { chainNodes, chainEdges };
}

// ============================================================================
// Main DependencyNetwork Route Component
// ============================================================================

export const DependencyNetwork: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    hoveredActivityId,
    selectedActivityId,
    criticalPathOnly,
    selectedDisciplines,
    searchQuery,
    zoom,
    collapsedLanes,
    expandedParents,
    densityMode,
    setDensityMode,
    isSimulationActive,
    setIsSimulationActive,
    simulationDays,
    setSimulatedDelay,
    resetSimulation,
    customPredecessors,
    addPredecessorLink,
    setHoveredActivityId,
    setSelectedActivityId,
    toggleCriticalPathOnly,
    toggleDiscipline,
    resetDisciplines,
    setSearchQuery,
    zoomIn,
    zoomOut,
    zoomFit,
    toggleLaneCollapse,
    toggleParentExpand,
  } = useNetworkStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  // Sync with URL search params (Bi-directional deep linking)
  useEffect(() => {
    const urlId = searchParams.get('selectedId');
    if (urlId) {
      setSelectedActivityId(urlId);
    }
  }, [searchParams, setSelectedActivityId]);

  // Drilldown state to view all info of a supervisor
  const [drillSupervisor, setDrillSupervisor] = useState<{ name: string; discipline: string } | null>(null);

  // Audio Playback State for field voice notes
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const audioIntervalRef = useRef<any>(null);

  const playVoiceNote = useCallback(() => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      clearInterval(audioIntervalRef.current);
      return;
    }

    setIsPlayingAudio(true);
    setAudioProgress(0);

    // Synthesize ambient industrial radio note via Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {}

    audioIntervalRef.current = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          clearInterval(audioIntervalRef.current);
          setIsPlayingAudio(false);
          return 0;
        }
        return prev + 5;
      });
    }, 250);
  }, [isPlayingAudio]);

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // Predecessor Linker Form State
  const [isLinkingOpen, setIsLinkingOpen] = useState<boolean>(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedLinkType, setSelectedLinkType] = useState<'FS' | 'SS' | 'FF'>('FS');
  const [selectedLinkLag, setSelectedLinkLag] = useState<number>(0);

  // Real-time WebSocket connection for live field updates
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastLiveMessage, setLastLiveMessage] = useState<{ activity_id: string; new_status: string } | null>(null);
  const [realtimeOverrides, setRealtimeOverrides] = useState<Record<string, Status>>({});

  useEffect(() => {
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const host =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1:8000'
        : window.location.host;

    const wsUrl = `${wsProtocol}//${host}/workflow/ws/1`;
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

            // Map backend status to Status union
            const s = (data.new_status || '').toLowerCase();
            const mappedStatus: Status =
              s === 'completed' || s === 'complete'
                ? 'complete'
                : s === 'delayed' || s === 'behind'
                ? 'behind'
                : s === 'needs_review'
                ? 'at_risk'
                : 'in_progress';

            setRealtimeOverrides((prev) => ({
              ...prev,
              [data.activity_id]: mappedStatus,
            }));
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
  }, []);

  // Sync gutter vertical scroll with main canvas
  const handleScroll = () => {
    if (canvasScrollRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = canvasScrollRef.current.scrollTop;
    }
  };

  // TanStack Query to fetch network data
  const { data: rawActivities = MOCK_NETWORK_ACTIVITIES } = useQuery<Activity[]>({
    queryKey: ['dependency-network-activities'],
    queryFn: () => api.getDependencyNetwork?.(1) || Promise.resolve(MOCK_NETWORK_ACTIVITIES),
    initialData: MOCK_NETWORK_ACTIVITIES,
  });

  // Merge custom predecessor links & simulation delays into activities
  const effectiveActivities = useMemo(() => {
    return rawActivities.map((act) => {
      const customs = customPredecessors[act.id] || [];
      const mergedPreds = [...act.predecessors];
      customs.forEach((cp) => {
        if (!mergedPreds.some((p) => p.id === cp.id)) {
          mergedPreds.push(cp);
        }
      });

      let simulatedFloat = act.totalFloat;
      if (isSimulationActive) {
        const addedDelay = simulationDays[act.id] || 0;
        simulatedFloat -= addedDelay;
      }

      const isDriving = isSimulationActive
        ? act.isDriving || simulatedFloat <= 0
        : act.isDriving;

      const wsStatus = realtimeOverrides[act.id];
      const effectiveStatus: Status =
        simulatedFloat < 0 ? 'behind' : wsStatus || act.status;

      return {
        ...act,
        predecessors: mergedPreds,
        totalFloat: simulatedFloat,
        isDriving,
        status: effectiveStatus,
      };
    });
  }, [rawActivities, customPredecessors, isSimulationActive, simulationDays, realtimeOverrides]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let result = effectiveActivities;

    // Filter by discipline
    if (selectedDisciplines.size > 0 && selectedDisciplines.size < ORDERED_DISCIPLINES.length) {
      result = result.filter((a) => selectedDisciplines.has(a.discipline));
    }

    // Filter by critical path only
    if (criticalPathOnly) {
      result = result.filter((a) => a.isDriving || a.totalFloat <= 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.supervisor.toLowerCase().includes(q)
      );
    }

    return result;
  }, [effectiveActivities, selectedDisciplines, criticalPathOnly, searchQuery]);

  // Compute Layout (single source of truth)
  const layout = useMemo(() => {
    return computeLayout(filteredActivities, collapsedLanes, expandedParents);
  }, [filteredActivities, collapsedLanes, expandedParents]);

  // Active highlighted chain on hover
  const activeChain = useMemo(() => {
    if (!hoveredActivityId) return null;
    return computeTransitiveChain(hoveredActivityId, filteredActivities);
  }, [hoveredActivityId, filteredActivities]);

  // Connectors computation
  const connectors = useMemo(() => {
    const list: ConnectorPath[] = [];

    filteredActivities.forEach((act) => {
      const targetPos = layout.placedNodes.get(act.id);
      if (!targetPos) return;

      act.predecessors.forEach((pred) => {
        const sourcePos = layout.placedNodes.get(pred.id);
        if (!sourcePos) return;

        // Source right edge center
        const x1 = sourcePos.x + sourcePos.width;
        const y1 = sourcePos.y + sourcePos.height / 2;

        // Target left edge center
        const x2 = targetPos.x;
        const y2 = targetPos.y + targetPos.height / 2;

        const { pathD, midX, midY } = generateRoundedElbowPath(x1, y1, x2, y2, 9);
        const isDriving = act.isDriving && sourcePos.activity.isDriving;

        list.push({
          id: `${pred.id}->${act.id}`,
          fromId: pred.id,
          toId: act.id,
          pathD,
          isDriving,
          type: pred.type,
          lagDays: pred.lagDays,
          midX,
          midY,
        });
      });
    });

    return list;
  }, [filteredActivities, layout.placedNodes]);

  // Selected Activity Object for the 296px side panel
  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return effectiveActivities.find((a) => a.id === selectedActivityId) || null;
  }, [selectedActivityId, effectiveActivities]);

  // Drives list (immediate downstream activities)
  const drivesActivities = useMemo(() => {
    if (!selectedActivity) return [];
    return effectiveActivities.filter((a) =>
      a.predecessors.some((p) => p.id === selectedActivity.id)
    );
  }, [selectedActivity, effectiveActivities]);

  // Window width tracking to collapse/drawer right panel below 1100px
  const [isBelow1100, setIsBelow1100] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1100 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsBelow1100(window.innerWidth < 1100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Sorted nodes in schedule order (by X column, then Y row) for accessible tab traversal
  const sortedScheduleNodes = useMemo(() => {
    return Array.from(layout.placedNodes.values()).sort(
      (a, b) => a.x - b.x || a.y - b.y
    );
  }, [layout.placedNodes]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${
        isFullscreen ? 'h-screen w-screen' : 'h-[calc(100vh-64px)] w-full'
      } bg-[#0C0C0D] text-[#F7F7F5] overflow-hidden select-none font-sans`}
    >
      {/* ================================================================== */}
      {/* TOP CONTROL BAR: Filters & Zoom                                    */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#141417] border-b border-[#2A2A30] z-30 flex-shrink-0">
        {/* Left: Critical Path toggle & Discipline Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Critical Path Toggle */}
          <button
            onClick={toggleCriticalPathOnly}
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap border ${
              criticalPathOnly
                ? 'bg-[#E0242B] text-white border-[#E0242B] shadow-md shadow-red-950/40'
                : 'bg-[#1B1B1F] text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
            }`}
          >
            Critical path only
          </button>

          {/* Discipline Chips */}
          <div className="flex items-center gap-1.5 ml-1">
            {ORDERED_DISCIPLINES.map((d) => {
              const isActive = selectedDisciplines.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDiscipline(d.id)}
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

          {/* L5 / L6 Density Switch */}
          <div className="flex items-center bg-[#1B1B1F] border border-[#2A2A30] rounded-md p-0.5 text-xs text-[#8E8E96] ml-1">
            <button
              onClick={() => setDensityMode('L6')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                densityMode === 'L6'
                  ? 'bg-[#F7F7F5] text-[#0C0C0D] font-bold'
                  : 'text-[#8E8E96] hover:text-[#F7F7F5]'
              }`}
              title="L6 Individual Activity Level"
            >
              L6 Detail
            </button>
            <button
              onClick={() => setDensityMode('L5')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                densityMode === 'L5'
                  ? 'bg-[#F7F7F5] text-[#0C0C0D] font-bold'
                  : 'text-[#8E8E96] hover:text-[#F7F7F5]'
              }`}
              title="L5 Consolidated Work Packages"
            >
              L5 Macro
            </button>
          </div>

          {/* Slippage Sandbox Toggle */}
          <button
            onClick={() => setIsSimulationActive(!isSimulationActive)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ml-1 ${
              isSimulationActive
                ? 'bg-[#C9942A] text-black border-[#C9942A] shadow-md shadow-amber-950/50 font-bold'
                : 'bg-[#1B1B1F] text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
            }`}
            title="Simulate delay ripples on downstream activities"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Slippage Sandbox</span>
          </button>
        </div>

        {/* Right: Live Beacon, Search Box & Zoom Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live Feed Status Beacon */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B1B1F] border border-[#2A2A30] text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#C9942A]'
              }`}
            />
            <span className="font-mono font-semibold text-[#F7F7F5]">
              {wsConnected ? 'LIVE FEED' : 'CONNECTING...'}
            </span>
          </div>

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

      {/* Slippage Sandbox Active Banner */}
      {isSimulationActive && (
        <div className="h-8 px-4 bg-[#C9942A]/15 border-b border-[#C9942A]/30 flex items-center justify-between text-xs text-[#C9942A] z-25 select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 animate-pulse text-[#C9942A]" />
            <span className="font-semibold text-xs">
              SLIPPAGE SANDBOX: Select any activity in the grid or inspector to test date delays and downstream buffer consumption.
            </span>
          </div>
          <button
            onClick={resetSimulation}
            className="px-2 py-0.5 rounded bg-[#C9942A]/20 hover:bg-[#C9942A]/30 text-[#F7F7F5] border border-[#C9942A]/40 text-[10px] font-bold uppercase transition-colors cursor-pointer"
          >
            Reset All Delays
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN VIEWPORT: Sticky Left Gutter + Scrollable Canvas + Right Panel */}
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
            className="border-b border-[#2A2A30] bg-[#141417] flex items-center px-3 text-[10px] uppercase font-mono tracking-wider text-[#8E8E96]"
          >
            Discipline
          </div>

          {/* Lane Labels in sync with canvas */}
          <div className="relative">
            {layout.lanes.map((lane) => (
              <div
                key={lane.discipline}
                style={{ height: lane.height }}
                className="px-3 pt-3.5 border-b border-[#2A2A30]/60 flex flex-col justify-start"
              >
                <div className="flex items-start justify-between">
                  <div className="leading-snug pr-1">
                    <span className="text-xs font-bold text-[#F7F7F5] block truncate">
                      {lane.label}
                    </span>
                    <span className="text-[10px] text-[#8E8E96] font-mono block mt-0.5">
                      {lane.activities.length} act
                    </span>
                  </div>

                  {/* Collapse / Expand L5 Rollup Toggle */}
                  <button
                    onClick={() => toggleLaneCollapse(lane.discipline)}
                    className="p-0.5 text-[#8E8E96] hover:text-white rounded hover:bg-[#1B1B1F] cursor-pointer"
                    title={lane.isCollapsed ? 'Expand Lane' : 'Collapse to L5 parents'}
                  >
                    {lane.isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SCROLLABLE CANVAS AREA */}
        <div
          ref={canvasScrollRef}
          onScroll={handleScroll}
          className="flex-1 h-full overflow-auto relative custom-scrollbar bg-[#0C0C0D]"
        >
          {/* Canvas Transform Container */}
          <div
            style={{
              width: layout.totalWidth,
              height: layout.totalHeight + 80,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="relative min-w-full"
          >
            {/* STICKY TOP RULER (34px) */}
            <div
              style={{ height: RULER_HEIGHT, width: layout.totalWidth }}
              className="sticky top-0 z-20 bg-[#141417] border-b border-[#2A2A30] flex items-center font-mono text-[11px] text-[#8E8E96]"
            >
              {WEEKS.map((w, i) => (
                <div
                  key={w.id}
                  style={{ width: COLUMN_WIDTH }}
                  className="px-4 font-semibold text-[#8E8E96] border-r border-[#2A2A30]/50 truncate"
                >
                  {w.label}
                </div>
              ))}
            </div>

            {/* VERTICAL COLUMN GRIDLINES dropping through canvas */}
            <div className="absolute top-[34px] bottom-0 left-0 right-0 pointer-events-none z-0">
              {WEEKS.map((w, i) => (
                <div
                  key={w.id}
                  style={{ left: (i + 1) * COLUMN_WIDTH }}
                  className="absolute top-0 bottom-0 w-px border-r border-[#1B1B1F]"
                />
              ))}

              {/* HORIZONTAL LANE DIVIDERS */}
              {layout.lanes.map((lane) => (
                <div
                  key={lane.discipline}
                  style={{ top: lane.top + lane.height }}
                  className="absolute left-0 right-0 h-px border-b border-[#2A2A30]/50"
                />
              ))}

              {/* DATA DATE RED VERTICAL LINE */}
              <div
                style={{ left: DATA_DATE_X }}
                className="absolute top-0 bottom-0 w-px bg-[#E0242B] z-10 flex flex-col items-center"
              >
                <div className="bg-[#141417] text-[#E0242B] border border-[#E0242B] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg mt-1 whitespace-nowrap">
                  DATA DATE
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SVG CONNECTORS LAYER (Single source of truth behind cards)    */}
            {/* ============================================================ */}
            <svg
              style={{
                width: layout.totalWidth,
                height: layout.totalHeight + 40,
              }}
              className="absolute top-0 left-0 pointer-events-none z-0 overflow-visible"
            >
              <defs>
                {/* Red arrowhead for driving edges */}
                <marker
                  id="arrow-driving"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E0242B" />
                </marker>

                {/* Gray arrowhead for non-driving edges */}
                <marker
                  id="arrow-default"
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
                      markerEnd={c.isDriving ? 'url(#arrow-driving)' : 'url(#arrow-default)'}
                      opacity={isDimmed ? 0.12 : 1.0}
                      className="transition-opacity duration-150"
                    />

                    {/* Edge Label on Highlighted Chain */}
                    {isHighlighted && (
                      <g
                        transform={`translate(${c.midX}, ${c.midY})`}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x="-24"
                          y="-9"
                          width="48"
                          height="18"
                          rx="3"
                          fill="#141417"
                          stroke="#2A2A30"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill="#F7F7F5"
                          fontFamily="IBM Plex Mono, monospace"
                          fontSize="9"
                          fontWeight="600"
                        >
                          {c.type} {c.lagDays > 0 ? `+${c.lagDays}d` : `${c.lagDays}d`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ============================================================ */}
            {/* CARDS LAYER                                                  */}
            {/* ============================================================ */}
            <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-10">
              {sortedScheduleNodes.map(({ activity, x, y, width, height }) => {
                const isSelected = selectedActivityId === activity.id;
                const isHovered = hoveredActivityId === activity.id;
                const inChain = activeChain ? activeChain.chainNodes.has(activity.id) : true;
                const opacity = activeChain && !inChain ? 0.18 : 1.0;

                const isComplete = activity.status === 'complete';
                const isBehind = activity.status === 'behind';
                const isBlocked = activity.status === 'blocked';
                const isAtRisk = activity.status === 'at_risk';
                const isInProgress = activity.status === 'in_progress';

                // Status Stripe on left edge
                // Complete = #10B981 (green), In Progress = #F7F7F5, At Risk = #C9942A, Behind/Blocked = #E0242B
                const stripeColor = isComplete
                  ? '#10B981'
                  : isBehind || isBlocked
                  ? '#E0242B'
                  : isAtRisk
                  ? '#C9942A'
                  : '#F7F7F5';

                // Provenance label
                const provenanceDotColor = isComplete
                  ? '#10B981'
                  : activity.provenance === 'ai_linked'
                  ? '#F7F7F5'
                  : activity.provenance === 'needs_review'
                  ? '#C9942A'
                  : '#8E8E96';

                const provenanceText =
                  activity.provenance === 'ai_linked'
                    ? `AI-linked ${activity.confidence || 93}%`
                    : activity.provenance === 'needs_review'
                    ? `AI ${activity.confidence || 76}% · review`
                    : `Entered by ${activity.supervisor.split(' ').pop() || 'Lead'}`;

                return (
                  <button
                    key={activity.id}
                    id={`activity-card-${activity.id}`}
                    tabIndex={0}
                    onClick={() => setSelectedActivityId(isSelected ? null : activity.id)}
                    onMouseEnter={() => setHoveredActivityId(activity.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const laneNodes = sortedScheduleNodes.filter(
                          (n) => n.activity.discipline === activity.discipline
                        );
                        const currIdx = laneNodes.findIndex((n) => n.activity.id === activity.id);
                        const targetIdx = e.key === 'ArrowRight' ? currIdx + 1 : currIdx - 1;
                        if (targetIdx >= 0 && targetIdx < laneNodes.length) {
                          const targetEl = document.getElementById(
                            `activity-card-${laneNodes[targetIdx].activity.id}`
                          );
                          targetEl?.focus();
                        }
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedActivityId(isSelected ? null : activity.id);
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
                        : isBehind || isBlocked
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
                        borderStyle: isBlocked ? 'dashed' : 'solid',
                      }}
                      className={`absolute left-0 top-1 bottom-1 w-[2.5px] rounded-l ${
                        isBlocked ? 'border-l-2 border-dashed border-[#E0242B] bg-transparent' : ''
                      }`}
                    />

                    {/* Top Row: Activity Code + DRIVING badge */}
                    <div className="flex items-center justify-between pl-1 mb-1">
                      <span
                        className={`font-mono text-[10px] tracking-tight ${
                          isComplete ? 'text-[#10B981]' : 'text-[#8E8E96]'
                        }`}
                      >
                        {activity.id}
                      </span>

                      {activity.isDriving && (
                        <span className="px-1 py-0.2 text-[8.5px] font-bold font-mono text-[#E0242B] border border-[#E0242B] rounded leading-tight tracking-wider uppercase">
                          DRIVING
                        </span>
                      )}
                    </div>

                    {/* Activity Name (2 lines max clamped) */}
                    <div
                      className="text-xs font-semibold leading-tight line-clamp-2 pl-1 mb-2 text-[#F7F7F5]"
                    >
                      {activity.name}
                    </div>

                    {/* 2px Progress Bar */}
                    <div className="w-full bg-[#1B1B1F] rounded-full h-[2px] mb-1.5 overflow-hidden">
                      <div
                        style={{
                          width: `${activity.percentComplete}%`,
                          backgroundColor: isComplete
                            ? '#10B981'
                            : isBehind
                            ? '#E0242B'
                            : '#F7F7F5',
                        }}
                        className="h-[2px] transition-all"
                      />
                    </div>

                    {/* Bottom Row: Provenance + Total Float */}
                    <div className="flex items-center justify-between text-[10px] pl-1 font-sans">
                      {/* Left: Provenance with small dot */}
                      <div className="flex items-center gap-1.5 truncate max-w-[125px]">
                        <span
                          style={{ backgroundColor: provenanceDotColor }}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        />
                        <span
                          className={`truncate font-medium ${
                            isComplete
                              ? 'text-[#10B981]'
                              : activity.provenance === 'needs_review'
                              ? 'text-[#C9942A]'
                              : 'text-[#8E8E96]'
                          }`}
                        >
                          {provenanceText}
                        </span>
                      </div>

                      {/* Right: Total Float in Mono */}
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          activity.totalFloat < 0
                            ? 'text-[#E0242B]'
                            : isComplete
                            ? 'text-[#10B981]'
                            : 'text-[#8E8E96]'
                        }`}
                      >
                        {activity.totalFloat > 0
                          ? `+${activity.totalFloat}d`
                          : `${activity.totalFloat}d`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 296px RIGHT INSPECTOR PANEL (When an activity is clicked)          */}
        {/* ================================================================== */}
        {isBelow1100 && selectedActivity && (
          <div
            className="fixed inset-0 bg-black/60 z-40 transition-opacity"
            onClick={() => setSelectedActivityId(null)}
            title="Click to dismiss panel"
          />
        )}
        {selectedActivity && (
          <div
            style={{ width: drillSupervisor ? 360 : 312 }}
            className={`${
              isBelow1100
                ? 'fixed right-0 top-0 bottom-0 z-50 shadow-2xl animate-in slide-in-from-right duration-200'
                : 'h-full z-40'
            } bg-[#141417] border-l border-[#2A2A30] flex flex-col flex-shrink-0 shadow-2xl overflow-y-auto custom-scrollbar select-none transition-all duration-200`}
          >
            {drillSupervisor ? (
              <SupervisorDetailPanel
                supervisorName={drillSupervisor.name}
                discipline={drillSupervisor.discipline}
                allActivities={effectiveActivities}
                onSelectActivity={(id) => {
                  setSelectedActivityId(id);
                  setDrillSupervisor(null);
                }}
                onBack={() => setDrillSupervisor(null)}
                onClose={() => {
                  setDrillSupervisor(null);
                  setSelectedActivityId(null);
                }}
              />
            ) : (
              <>
                {/* Panel Header */}
            <div className="p-4 border-b border-[#2A2A30]">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-mono text-[10px] text-[#8E8E96]">
                    {selectedActivity.id} · <span className="capitalize">{selectedActivity.discipline}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F7F7F5] leading-snug">
                    {selectedActivity.name}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedActivityId(null)}
                  className="p-1 text-[#8E8E96] hover:text-[#F7F7F5] rounded hover:bg-[#1B1B1F] cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="p-4 space-y-3 text-xs border-b border-[#2A2A30]">
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E96]">Status</span>
                <span
                  className={`font-semibold capitalize ${
                    selectedActivity.status === 'behind' || selectedActivity.status === 'blocked'
                      ? 'text-[#E0242B]'
                      : selectedActivity.status === 'at_risk'
                      ? 'text-[#C9942A]'
                      : selectedActivity.status === 'complete'
                      ? 'text-[#10B981]'
                      : 'text-[#F7F7F5]'
                  }`}
                >
                  {selectedActivity.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8E96]">Progress</span>
                <span className="font-mono font-bold text-[#F7F7F5]">
                  {selectedActivity.percentComplete}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8E96]">Finish</span>
                <span className="font-mono text-[#F7F7F5]">
                  {selectedActivity.forecastFinish}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8E96]">Total float</span>
                <span
                  className={`font-mono font-bold ${
                    selectedActivity.totalFloat < 0 ? 'text-[#E0242B]' : 'text-[#8E8E96]'
                  }`}
                >
                  {selectedActivity.totalFloat > 0
                    ? `+${selectedActivity.totalFloat} d`
                    : `${selectedActivity.totalFloat} d`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8E96]">Supervisor</span>
                <button
                  onClick={() =>
                    setDrillSupervisor({
                      name: selectedActivity.supervisor,
                      discipline: selectedActivity.discipline,
                    })
                  }
                  className="text-[#C9942A] hover:underline font-medium cursor-pointer flex items-center gap-1"
                  title="Click to view complete supervisor info & dossier"
                >
                  <span>{selectedActivity.supervisor}</span>
                  <span className="text-[10px]">↗</span>
                </button>
              </div>
            </div>

            {/* Layer-Wise Supervisor Intelligence Card */}
            <div className="p-4 border-b border-[#2A2A30]">
              <SupervisorLayerCard
                supervisorName={selectedActivity.supervisor}
                discipline={selectedActivity.discipline}
                currentActivityId={selectedActivity.id}
                allActivities={effectiveActivities}
                onSelectActivity={(id) => setSelectedActivityId(id)}
                onClickSupervisor={() =>
                  setDrillSupervisor({
                    name: selectedActivity.supervisor,
                    discipline: selectedActivity.discipline,
                  })
                }
              />
            </div>

            {/* "Captured from" Section with Audio Note Player */}
            <div className="p-4 space-y-2.5 border-b border-[#2A2A30]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E96]">
                  Captured from
                </span>
                <span className="text-[10px] font-mono text-[#8E8E96]">
                  {selectedActivity.provenance === 'ai_linked'
                    ? 'AI Auto-Linked'
                    : selectedActivity.provenance === 'needs_review'
                    ? 'Planner Review'
                    : 'Manual Record'}
                </span>
              </div>

              {selectedActivity.sourceExcerpt ? (
                <div className="p-2.5 rounded bg-[#0C0C0D] border border-[#2A2A30] text-[11px] text-[#8E8E96] italic leading-relaxed">
                  "{selectedActivity.sourceExcerpt}"
                </div>
              ) : (
                <div className="p-2.5 rounded bg-[#0C0C0D] border border-[#2A2A30] text-[11px] text-[#4A4A52] italic">
                  Manual baseline schedule record
                </div>
              )}

              {/* Voice Note Audio Player Widget */}
              <div className="p-2.5 rounded bg-[#0C0C0D] border border-[#2A2A30] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={playVoiceNote}
                      className="w-7 h-7 rounded-full bg-[#E0242B] hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer flex-shrink-0"
                      title={isPlayingAudio ? 'Pause Voice Note' : 'Play Voice Note'}
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="text-[11px] font-semibold text-[#F7F7F5] flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[#C9942A]" />
                        <span>Supervisor Voice Log</span>
                      </div>
                      <div className="text-[10px] text-[#8E8E96]">0:14s · Field Radio Transceiver</div>
                    </div>
                  </div>

                  {/* Equalizer Bars */}
                  <div className="flex items-end gap-0.5 h-4">
                    <span
                      className={`w-1 rounded-sm bg-[#E0242B] transition-all duration-150 ${
                        isPlayingAudio ? 'h-4 animate-pulse' : 'h-1.5'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-sm bg-[#C9942A] transition-all duration-150 ${
                        isPlayingAudio ? 'h-3 animate-pulse delay-75' : 'h-2'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-sm bg-[#E0242B] transition-all duration-150 ${
                        isPlayingAudio ? 'h-4 animate-pulse delay-150' : 'h-1'
                      }`}
                    />
                    <span
                      className={`w-1 rounded-sm bg-[#F7F7F5] transition-all duration-150 ${
                        isPlayingAudio ? 'h-2.5 animate-pulse delay-100' : 'h-1.5'
                      }`}
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#1B1B1F] h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#E0242B] h-full transition-all duration-200"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>

              {/* 3 Signal Scores */}
              {selectedActivity.signals && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="p-2 rounded bg-[#1B1B1F] border border-[#2A2A30] text-center">
                    <div className="font-mono text-xs font-bold text-[#F7F7F5]">
                      {selectedActivity.signals.semantic}%
                    </div>
                    <div className="text-[9px] text-[#8E8E96] mt-0.5">Semantic</div>
                  </div>

                  <div className="p-2 rounded bg-[#1B1B1F] border border-[#2A2A30] text-center">
                    <div className="font-mono text-xs font-bold text-[#F7F7F5]">
                      {selectedActivity.signals.entity}%
                    </div>
                    <div className="text-[9px] text-[#8E8E96] mt-0.5">Entity</div>
                  </div>

                  <div className="p-2 rounded bg-[#1B1B1F] border border-[#2A2A30] text-center">
                    <div className="font-mono text-xs font-bold text-[#F7F7F5]">
                      {selectedActivity.signals.metadata}%
                    </div>
                    <div className="text-[9px] text-[#8E8E96] mt-0.5">Metadata</div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Confirm Link & Relink or View Audit Trail */}
              {selectedActivity.provenance === 'needs_review' ? (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => alert(`Confirmed link for ${selectedActivity.id}`)}
                    className="flex-1 py-1.5 px-3 rounded bg-[#E0242B] hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm link</span>
                  </button>

                  <button
                    onClick={() => alert(`Relink triggered for ${selectedActivity.id}`)}
                    className="py-1.5 px-3 rounded bg-[#1B1B1F] hover:bg-[#2A2A30] text-[#F7F7F5] border border-[#2A2A30] text-xs transition-colors cursor-pointer"
                  >
                    Relink
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => alert(`Audit log entries for ${selectedActivity.id}`)}
                  className="w-full mt-1 py-1.5 px-3 rounded bg-[#1B1B1F] hover:bg-[#2A2A30] text-[#F7F7F5] border border-[#2A2A30] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#8E8E96]" />
                  <span>View audit trail</span>
                </button>
              )}
            </div>

            {/* What-If Delay Simulation (Slippage Sandbox) */}
            <div className="p-4 space-y-2.5 border-b border-[#2A2A30] bg-[#101012]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9942A] flex items-center gap-1.5">
                  <FlaskConical className="w-3 h-3" />
                  <span>Slippage Sandbox</span>
                </span>
                {(simulationDays[selectedActivity.id] || 0) > 0 && (
                  <button
                    onClick={() => setSimulatedDelay(selectedActivity.id, 0)}
                    className="text-[10px] text-[#8E8E96] hover:text-[#E0242B] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {[0, 2, 4, 7].map((days) => {
                  const isCurrent = (simulationDays[selectedActivity.id] || 0) === days;
                  return (
                    <button
                      key={days}
                      onClick={() => {
                        if (!isSimulationActive) setIsSimulationActive(true);
                        setSimulatedDelay(selectedActivity.id, days);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-mono font-semibold transition-colors border cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C9942A] text-black border-[#C9942A] font-bold'
                          : 'bg-[#1B1B1F] text-[#8E8E96] hover:text-[#F7F7F5] border-[#2A2A30]'
                      }`}
                    >
                      +{days}d
                    </button>
                  );
                })}
              </div>

              {/* Warning / Float Impact Feedback */}
              {(simulationDays[selectedActivity.id] || 0) > 0 && (
                <div
                  className={`p-2 rounded text-[11px] leading-tight border ${
                    selectedActivity.totalFloat < 0
                      ? 'bg-red-950/40 border-red-800/60 text-[#E0242B]'
                      : 'bg-amber-950/30 border-amber-800/50 text-[#C9942A]'
                  }`}
                >
                  {selectedActivity.totalFloat < 0 ? (
                    <div className="font-semibold">
                      ⚠️ Slipped by {simulationDays[selectedActivity.id]}d: Float exhausted ({selectedActivity.totalFloat}d). Critical driving path downstream pushed out!
                    </div>
                  ) : (
                    <div>
                      Buffer consumed by +{simulationDays[selectedActivity.id]}d. Remaining total float: +{selectedActivity.totalFloat}d.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Predecessors & Interactive Predecessor Linker */}
            <div className="p-4 space-y-2.5 border-b border-[#2A2A30]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E96]">
                  Predecessors ({selectedActivity.predecessors.length})
                </span>
                <button
                  onClick={() => setIsLinkingOpen(!isLinkingOpen)}
                  className="text-[10px] font-semibold text-[#C9942A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Link2 className="w-3 h-3" />
                  <span>{isLinkingOpen ? 'Cancel' : '+ Link Predecessor'}</span>
                </button>
              </div>

              {/* Predecessor Linker Form */}
              {isLinkingOpen && (
                <div className="p-2.5 rounded bg-[#0C0C0D] border border-[#C9942A]/40 space-y-2 animate-in fade-in duration-150">
                  <label className="text-[10px] text-[#8E8E96] block">Select Driving Activity:</label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full bg-[#1B1B1F] border border-[#2A2A30] text-xs text-[#F7F7F5] rounded p-1 outline-none"
                  >
                    <option value="">-- Choose predecessor activity --</option>
                    {effectiveActivities
                      .filter(
                        (a) =>
                          a.id !== selectedActivity.id &&
                          !selectedActivity.predecessors.some((p) => p.id === a.id)
                      )
                      .map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.id} · {cand.name.slice(0, 24)}...
                        </option>
                      ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <label className="text-[10px] text-[#8E8E96] block">Link Type:</label>
                      <select
                        value={selectedLinkType}
                        onChange={(e) => setSelectedLinkType(e.target.value as any)}
                        className="w-full bg-[#1B1B1F] border border-[#2A2A30] text-xs text-[#F7F7F5] rounded p-1 outline-none"
                      >
                        <option value="FS">Finish-to-Start (FS)</option>
                        <option value="SS">Start-to-Start (SS)</option>
                        <option value="FF">Finish-to-Finish (FF)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8E8E96] block">Lag (Days):</label>
                      <input
                        type="number"
                        min="0"
                        max="14"
                        value={selectedLinkLag}
                        onChange={(e) => setSelectedLinkLag(Number(e.target.value))}
                        className="w-full bg-[#1B1B1F] border border-[#2A2A30] text-xs text-[#F7F7F5] rounded p-1 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    disabled={!selectedCandidateId}
                    onClick={() => {
                      if (selectedCandidateId) {
                        addPredecessorLink(
                          selectedActivity.id,
                          selectedCandidateId,
                          selectedLinkType,
                          selectedLinkLag
                        );
                        setIsLinkingOpen(false);
                        setSelectedCandidateId('');
                      }
                    }}
                    className={`w-full py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedCandidateId
                        ? 'bg-[#C9942A] text-black hover:bg-amber-500 font-bold'
                        : 'bg-[#2A2A30] text-[#8E8E96] cursor-not-allowed'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Connect Schedule Edge</span>
                  </button>
                </div>
              )}

              {/* Current Predecessors List */}
              {selectedActivity.predecessors.length === 0 ? (
                <div className="text-[11px] text-[#4A4A52] italic">
                  Head task — no incoming dependencies.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedActivity.predecessors.map((pred) => (
                    <button
                      key={pred.id}
                      onClick={() => setSelectedActivityId(pred.id)}
                      className="w-full p-2 rounded bg-[#0C0C0D] border border-[#2A2A30] hover:border-[#8E8E96] transition-colors flex items-center justify-between text-left cursor-pointer group"
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono text-[10px] text-[#8E8E96] group-hover:text-white">
                          {pred.id}
                        </div>
                        <div className="text-xs text-[#F7F7F5] truncate leading-tight mt-0.5">
                          {effectiveActivities.find((a) => a.id === pred.id)?.name || 'Predecessor'}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1B1B1F] text-[#8E8E96] border border-[#2A2A30]">
                        {pred.type} {pred.lagDays > 0 ? `+${pred.lagDays}d` : '+0d'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* "Drives" Downstream Activities Section */}
            <div className="p-4 space-y-2 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E96]">
                Drives ({drivesActivities.length})
              </span>

              {drivesActivities.length === 0 ? (
                <div className="text-[11px] text-[#4A4A52] italic">
                  Terminal task — no successor links.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {drivesActivities.map((succ) => (
                    <button
                      key={succ.id}
                      onClick={() => setSelectedActivityId(succ.id)}
                      className="w-full p-2 rounded bg-[#0C0C0D] border border-[#2A2A30] hover:border-[#8E8E96] transition-colors flex items-center justify-between text-left cursor-pointer group"
                    >
                      <div className="truncate pr-2">
                        <div className="font-mono text-[10px] text-[#8E8E96] group-hover:text-white">
                          {succ.id}
                        </div>
                        <div className="text-xs text-[#F7F7F5] truncate leading-tight mt-0.5">
                          {succ.name}
                        </div>
                      </div>

                      <span
                        className={`font-mono text-[10px] font-bold ${
                          succ.totalFloat < 0 ? 'text-[#E0242B]' : 'text-[#8E8E96]'
                        }`}
                      >
                        {succ.totalFloat > 0 ? `+${succ.totalFloat}d` : `${succ.totalFloat}d`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bi-directional Navigation Quick-Jump Button */}
            <div className="p-4 border-t border-[#2A2A30] bg-[#0C0C0D]">
              <button
                onClick={() => navigate(`/planner/workflow?selectedId=${selectedActivity.id}`)}
                className="w-full py-2 px-3 rounded bg-[#E0242B] hover:bg-red-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/50"
              >
                <span>View Live Site Stream & Supervisor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
              </>
            )}
          </div>
        )}

        {/* Live Update Notification Beacon */}
        {lastLiveMessage && (
          <div className="absolute bottom-12 right-6 z-30 px-3 py-2 rounded-lg bg-[#141417] border border-[#E0242B]/50 shadow-2xl flex items-center gap-2 select-none animate-in slide-in-from-bottom-2 duration-150">
            <div className="w-2 h-2 rounded-full bg-[#E0242B] animate-ping" />
            <span className="text-xs text-[#8E8E96]">
              Live update: <span className="font-mono font-bold text-[#F7F7F5]">{lastLiveMessage.activity_id}</span> is{' '}
              <span className="font-bold text-[#E0242B] uppercase">{lastLiveMessage.new_status}</span>
            </span>
          </div>
        )}

        {/* Bottom Legend (Green for Complete) */}
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
