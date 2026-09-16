import { create } from 'zustand';
import { Discipline } from '../mock/network';

interface NetworkState {
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  criticalPathOnly: boolean;
  selectedDisciplines: Set<Discipline>;
  searchQuery: string;
  zoom: number; // 0.45 - 1.40
  collapsedLanes: Set<Discipline>;
  expandedParents: Set<string>;

  // New Features: Density Switch, Simulation Sandbox, and Custom Links
  densityMode: 'L6' | 'L5';
  isSimulationActive: boolean;
  simulationDays: Record<string, number>;
  customPredecessors: Record<string, { id: string; type: 'FS' | 'SS' | 'FF'; lagDays: number }[]>;

  // Actions
  setHoveredActivityId: (id: string | null) => void;
  setSelectedActivityId: (id: string | null) => void;
  toggleCriticalPathOnly: () => void;
  toggleDiscipline: (d: Discipline) => void;
  resetDisciplines: () => void;
  setSearchQuery: (q: string) => void;
  setZoom: (z: number | ((prev: number) => number)) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  toggleLaneCollapse: (d: Discipline) => void;
  toggleParentExpand: (parentId: string) => void;

  setDensityMode: (mode: 'L6' | 'L5') => void;
  setIsSimulationActive: (active: boolean) => void;
  setSimulatedDelay: (activityId: string, days: number) => void;
  resetSimulation: () => void;
  addPredecessorLink: (
    targetId: string,
    predId: string,
    type?: 'FS' | 'SS' | 'FF',
    lagDays?: number
  ) => void;
}

const ALL_DISCIPLINES: Discipline[] = [
  'civil',
  'static',
  'piping',
  'electrical',
  'instrumentation',
  'commissioning',
];

export const useNetworkStore = create<NetworkState>((set) => ({
  hoveredActivityId: null,
  selectedActivityId: null,
  criticalPathOnly: false,
  selectedDisciplines: new Set<Discipline>(ALL_DISCIPLINES),
  searchQuery: '',
  zoom: 1.0,
  collapsedLanes: new Set<Discipline>(),
  expandedParents: new Set<string>(),

  setHoveredActivityId: (id) => set({ hoveredActivityId: id }),
  setSelectedActivityId: (id) => set({ selectedActivityId: id }),
  toggleCriticalPathOnly: () => set((state) => ({ criticalPathOnly: !state.criticalPathOnly })),

  toggleDiscipline: (d) =>
    set((state) => {
      const next = new Set(state.selectedDisciplines);
      if (next.has(d)) {
        if (next.size > 1) {
          next.delete(d);
        } else {
          // If only 1 was selected, reset to all
          return { selectedDisciplines: new Set(ALL_DISCIPLINES) };
        }
      } else {
        next.add(d);
      }
      return { selectedDisciplines: next };
    }),

  resetDisciplines: () => set({ selectedDisciplines: new Set(ALL_DISCIPLINES) }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  setZoom: (z) =>
    set((state) => {
      const next = typeof z === 'function' ? z(state.zoom) : z;
      return { zoom: Math.min(1.4, Math.max(0.45, Number(next.toFixed(2)))) };
    }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(1.4, Number((state.zoom + 0.1).toFixed(2))),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(0.45, Number((state.zoom - 0.1).toFixed(2))),
    })),

  zoomFit: () => set({ zoom: 1.0 }),

  toggleLaneCollapse: (d) =>
    set((state) => {
      const next = new Set(state.collapsedLanes);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return { collapsedLanes: next };
    }),

  toggleParentExpand: (parentId) =>
    set((state) => {
      const next = new Set(state.expandedParents);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return { expandedParents: next };
    }),

  // Density Switch
  densityMode: 'L6',
  setDensityMode: (mode) =>
    set(() => {
      if (mode === 'L5') {
        return {
          densityMode: 'L5',
          collapsedLanes: new Set<Discipline>(ALL_DISCIPLINES),
        };
      }
      return {
        densityMode: 'L6',
        collapsedLanes: new Set<Discipline>(),
      };
    }),

  // Simulation Sandbox
  isSimulationActive: false,
  simulationDays: {},
  setIsSimulationActive: (active) => set({ isSimulationActive: active }),
  setSimulatedDelay: (activityId, days) =>
    set((state) => ({
      simulationDays: {
        ...state.simulationDays,
        [activityId]: Math.max(0, days),
      },
    })),
  resetSimulation: () => set({ simulationDays: {} }),

  // Custom Predecessors
  customPredecessors: {},
  addPredecessorLink: (targetId, predId, type = 'FS', lagDays = 0) =>
    set((state) => {
      const existing = state.customPredecessors[targetId] || [];
      if (existing.some((p) => p.id === predId)) return state;
      return {
        customPredecessors: {
          ...state.customPredecessors,
          [targetId]: [...existing, { id: predId, type, lagDays }],
        },
      };
    }),
}));
