import { create } from 'zustand';

export interface ProjectItem {
  id: number;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  activity_count?: number;
}

export const KNOWN_PROJECTS: ProjectItem[] = [
  {
    id: 1,
    name: 'Numaligarh Refinery Expansion (Unit 3 & Offsites)',
    client: 'Oil India Limited',
    activity_count: 36,
  },
  {
    id: 2,
    name: 'Duliajan Central Gas Gathering Station (CGGS-2)',
    client: 'Oil India Limited',
    activity_count: 22,
  },
  {
    id: 3,
    name: 'Guwahati-Siliguri Pipeline Modernization (Phase II)',
    client: 'Oil India Limited',
    activity_count: 18,
  },
];

interface ProjectStoreState {
  selectedProjectId: number;
  setSelectedProjectId: (id: number) => void;
  selectedProjectName: string;
  setSelectedProjectName: (name: string) => void;
  selectedProjectActivityCount: number;
  setSelectedProjectActivityCount: (count: number) => void;
  setProject: (project: ProjectItem) => void;
}

const STORAGE_KEY_ID = 'schedulesync_selected_project_id';
const STORAGE_KEY_NAME = 'schedulesync_selected_project_name';

const getInitialProject = (): { id: number; name: string; count: number } => {
  if (typeof window === 'undefined') {
    return { id: 1, name: KNOWN_PROJECTS[0].name, count: KNOWN_PROJECTS[0].activity_count ?? 36 };
  }
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_ID);
    if (savedId) {
      const idNum = Number(savedId);
      const match = KNOWN_PROJECTS.find((p) => p.id === idNum);
      if (match) {
        return { id: match.id, name: match.name, count: match.activity_count ?? 0 };
      }
    }
  } catch {}
  return { id: 1, name: KNOWN_PROJECTS[0].name, count: KNOWN_PROJECTS[0].activity_count ?? 36 };
};

const initial = getInitialProject();

export const useProjectStore = create<ProjectStoreState>((set) => ({
  selectedProjectId: initial.id,
  selectedProjectName: initial.name,
  selectedProjectActivityCount: initial.count,
  setSelectedProjectId: (id) => {
    const match = KNOWN_PROJECTS.find((p) => p.id === id);
    try {
      localStorage.setItem(STORAGE_KEY_ID, String(id));
      if (match) localStorage.setItem(STORAGE_KEY_NAME, match.name);
    } catch {}
    set({
      selectedProjectId: id,
      selectedProjectName: match ? match.name : `Project #${id}`,
      selectedProjectActivityCount: match?.activity_count ?? 0,
    });
  },
  setSelectedProjectName: (name) => {
    try {
      localStorage.setItem(STORAGE_KEY_NAME, name);
    } catch {}
    set({ selectedProjectName: name });
  },
  setSelectedProjectActivityCount: (count) => set({ selectedProjectActivityCount: count }),
  setProject: (p) => {
    try {
      localStorage.setItem(STORAGE_KEY_ID, String(p.id));
      localStorage.setItem(STORAGE_KEY_NAME, p.name);
    } catch {}
    set({
      selectedProjectId: p.id,
      selectedProjectName: p.name,
      selectedProjectActivityCount: p.activity_count ?? 0,
    });
  },
}));
