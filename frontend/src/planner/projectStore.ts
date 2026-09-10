import { create } from 'zustand';

export interface ProjectItem {
  id: number;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  activity_count?: number;
}

interface ProjectStoreState {
  selectedProjectId: number;
  setSelectedProjectId: (id: number) => void;
  selectedProjectName: string;
  setSelectedProjectName: (name: string) => void;
  selectedProjectActivityCount: number;
  setSelectedProjectActivityCount: (count: number) => void;
  setProject: (project: ProjectItem) => void;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  selectedProjectId: 1,
  selectedProjectName: 'Numaligarh Refinery Expansion (Unit 3 & Offsites)',
  selectedProjectActivityCount: 36,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setSelectedProjectName: (name) => set({ selectedProjectName: name }),
  setSelectedProjectActivityCount: (count) => set({ selectedProjectActivityCount: count }),
  setProject: (p) =>
    set({
      selectedProjectId: p.id,
      selectedProjectName: p.name,
      selectedProjectActivityCount: p.activity_count ?? 0,
    }),
}));
