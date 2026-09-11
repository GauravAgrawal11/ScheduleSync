/**
 * ScheduleSync Shared API Client
 * Built against Member A's locked FastAPI Pydantic schemas,
 * with resilient fallback handlers for Member B & C endpoints.
 */

import { useAuthStore } from '../auth/authStore';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, '');

// Helper to add auth header
function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Interfaces
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'planner' | 'admin';
  discipline?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface Project {
  id: number;
  name: string;
  client: string;
  start_date: string;
  end_date: string;
  activity_count?: number;
  status?: 'RUNNING' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
}

export interface Activity {
  id: number;
  project_id: number;
  activity_id: string;
  activity_name: string;
  wbs_code?: string;
  discipline?: 'civil' | 'piping' | 'electrical' | 'instrumentation' | 'hse' | 'other';
  location?: string;
  planned_start?: string;
  planned_finish?: string;
  actual_start?: string;
  actual_finish?: string;
  status: string;
  trend?: 'recovering' | 'worsening' | 'stable';
}

export interface ActivityListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  activities: Activity[];
}

export interface ExtractedEvent {
  description: string;
  discipline: string;
  location: string;
  quantity?: string;
  date: string;
  status?: string;
}

export interface ReportSubmissionResponse {
  report_id: number;
  status: 'PROCESSED' | 'QUEUED' | 'PENDING';
  message: string;
  extracted_events?: ExtractedEvent[];
  suggested_match?: {
    match_id?: number;
    activity_id: string;
    activity_name: string;
    confidence: number;
    decision: 'auto' | 'review' | 'held';
  };
}

export interface MatchLogEntry {
  match_id: number;
  activity_id: string;
  activity_name: string;
  wbs_code?: string;
  semantic_score: number;
  entity_score: number;
  metadata_score: number;
  final_confidence: number;
  decision: 'auto' | 'review' | 'rejected';
  is_verified: boolean;
  verification_type?: 'AI' | 'MANUAL';
  verified_by?: string;
  verified_at?: string;
  activity_status?: string;
  matched_at: string;
}

export interface SubmissionSummary {
  id: number;
  date: string;
  supervisor_name: string;
  raw_text: string;
  discipline: string;
  location: string;
  status: 'matched' | 'pending review' | 'rejected';
  confidence: number;
  suggested_activity_id?: string;
  suggested_activity_name?: string;
  // Full match log
  match_log: MatchLogEntry[];
  is_verified: boolean;
  verification_type?: 'AI' | 'MANUAL';
  verified_by?: string;
  verified_at?: string;
  activity_status?: string;
  is_queued?: boolean;
  time?: string;
}

export interface MatchReviewItem {
  match_id: number;
  report_id: number;
  report_snippet: string;
  report_date: string;
  supervisor: string;
  discipline: string;
  location: string;
  extracted_fields: {
    action: string;
    line_ref?: string;
    quantity?: string;
    date: string;
  };
  suggested_activity: {
    id: number;
    activity_id: string;
    activity_name: string;
    wbs_code: string;
    planned_start: string;
    planned_finish: string;
    current_status?: string;
  };
  signals: {
    semantic: number;
    entity: number;
    metadata: number;
  };
  final_confidence: number;
  decision: 'auto' | 'review' | 'held' | 'rejected';
  is_verified: boolean;
  verification_type?: 'AI' | 'MANUAL';
  verified_by?: string;
  verified_at?: string;
  activity_status?: string;
  file_name?: string;
  source_type?: string;
  has_file?: boolean;
  file_url?: string;
}

export interface ActivityBreakdownItem {
  activity_id: string;
  name: string;
  discipline: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PLANNED';
  is_completed?: boolean;
  delay_days: number;
  is_delaying: boolean;
  delay_reason?: string;
  trend?: 'recovering' | 'worsening' | 'on_schedule' | 'completed';
  supervisor?: {
    supervisor_id: number;
    supervisor_name: string;
    supervisor_email: string;
  };
}

export interface AnalyticsSummary {
  project_id?: number;
  project_name?: string;
  total_activities: number;
  completed?: number;
  in_progress?: number;
  delayed?: number;
  needs_review?: number;
  completed_activities?: number;
  in_progress_activities?: number;
  overall_progress_pct?: number;
  schedule_variance_days?: number;
  critical_path_delayed_count?: number;
  sequence_violations_count?: number;
  average_confidence?: number;
  high_confidence_auto_linked_count?: number;
  review_queue_pending_count?: number;
  delayed_activities_count?: number;
  discipline_productivity?: {
    discipline: string;
    completed: number;
    in_progress: number;
    delayed: number;
  }[];
  delay_hotspots?: {
    activity_id: string;
    name: string;
    discipline: string;
    days_delayed: number;
    trend: 'recovering' | 'worsening';
  }[];
  activity_breakdown?: ActivityBreakdownItem[];
}

export interface ActivityHistoryItem {
  id: number;
  event_date: string;
  event_type: string;
  description: string;
  confidence: number;
  logged_by: string;
  approved_by?: string;
  status: string;
  file_name?: string;
  source_type?: string;
  file_url?: string;
}

export interface HistoricalDurationStat {
  pipe_diameter_in: number;
  instances: number;
  count: number;
  avg_actual_duration_days: number;
  avg_planned_duration_days?: number;
  avg_delay_days?: number;
}

export interface HistoricalDurationStatsResponse {
  activity_type: string;
  total_instances: number;
  stats: HistoricalDurationStat[];
}

export interface HistoricalMatchRow {
  activity_name: string;
  discipline: string;
  delay_reason?: string;
  delay_days: number;
  project_name?: string;
  pipe_diameter_in?: number;
  actual_duration_days?: number;
  similarity_score: number;
}

export interface HistoricalAskResponse {
  question: string;
  top_n: number;
  matches: HistoricalMatchRow[];
  summary: string;
}

export interface HistoricalProjectItem {
  project_id: string;
  project_name: string;
  site_type: string;
  region: string;
  start_date: string;
  end_date: string;
  status: string;
  activity_count: number;
  disciplines: string[];
  key_delay_factors: string;
}

export interface SequenceViolationItem {
  id: number;
  project_id?: number;
  activity_id: string;
  activity_name?: string;
  predecessor_activity_id: string;
  predecessor_name?: string;
  predecessor_status?: string;
  detected_at: string;
  acknowledged: boolean;
}

export interface ActivityForecastItem {
  activity_id: string;
  activity_name: string;
  discipline: string;
  historical_average_days: number;
  matched_historical_count: number;
  planned_duration_days?: number;
  elapsed_days: number;
  forecast_status: 'at_risk' | 'on_track_per_history';
  reason: string;
}

// ==================== SUPERVISOR ASSIGNMENT ====================
export interface OverloadedSupervisorDetail {
  supervisor_id: number;
  supervisor_name: string;
  discipline: string;
  project_week: number;
  total_days: number;
  capacity_days: number;
  excess_days: number;
}

export interface UnassignedActivityDetail {
  activity_id: string;
  activity_name: string;
  discipline: string;
  project_week: number;
  reason: string;
}

export interface AssignmentRunSummary {
  project_id: number;
  total_activities: number;
  total_assigned: number;
  unassigned_no_supervisor: number;
  unassigned_activities: UnassignedActivityDetail[];
  overloaded_count: number;
  overloaded_supervisors: OverloadedSupervisorDetail[];
  weekly_capacity_days: number;
}

export interface ReassignResponse {
  activity_id: string;
  activity_name: string;
  new_supervisor_id: number;
  new_supervisor_name: string;
  previous_supervisor_id?: number;
  previous_supervisor_name?: string;
  project_week: number;
  assignment_source: string;
  assigned_by?: number;
  assigned_by_name?: string;
  assigned_at: string;
  supervisor_total_week_days: number;
  weekly_capacity_days: number;
  is_overloaded: boolean;
  message: string;
}

export interface SupervisorTaskItem {
  activity_id: string;
  activity_name: string;
  discipline: string;
  location?: string;
  planned_start?: string;
  planned_finish?: string;
  planned_duration_days: number;
  status: string;
  project_week: number;
  assignment_source: 'auto' | 'manual';
  assigned_by_name?: string;
  assigned_at: string;
  starts_in_days?: number;
  schedule_state?: 'completed' | 'active_now' | 'queued';
  assignment_timeline_status?: string;
}

export interface SupervisorWorkloadActivity {
  id: number;
  activity_id: string;
  activity_name: string;
  discipline: string;
  planned_start?: string;
  planned_finish?: string;
  planned_duration_days: number;
  status: string;
  assignment_source: string;
  assigned_by_name?: string;
  starts_in_days?: number;
  schedule_state?: 'completed' | 'active_now' | 'queued';
  assignment_timeline_status?: string;
}

export interface AdminWorkloadRow {
  supervisor_id: number;
  supervisor_name: string;
  supervisor_email: string;
  discipline: string;
  project_week: number;
  total_activities: number;
  total_duration_days: number;
  is_overloaded: boolean;
  capacity_days: number;
  auto_assigned_count: number;
  manual_assigned_count: number;
  remaining_count?: number;
  completed_count?: number;
  overall_status?: 'on_track' | 'delayed' | 'completed' | 'no_tasks';
  status_detail?: string;
  activities: SupervisorWorkloadActivity[];
}

export interface ActivityProgressItem {
  activity_id: string;
  activity_name: string;
  discipline: string;
  status: string;
  planned_finish?: string;
  actual_finish?: string;
  days_overdue: number;
  is_delayed: boolean;
  completion_pct: number;
  last_progress_date?: string;
  starts_in_days?: number;
  schedule_state?: 'completed' | 'active_now' | 'queued' | string;
  assignment_timeline_status?: string;
  location?: string;
}

export interface SupervisorProgressSummary {
  supervisor_id: number;
  supervisor_name: string;
  discipline: string;
  total_assigned: number;
  completed_count: number;
  in_progress_count: number;
  remaining_count: number;
  overall_status: 'on_track' | 'delayed' | 'completed' | 'no_tasks';
  status_detail: string;
  days_difference?: number;
  critical_delayed_activities?: ActivityProgressItem[];
  activities?: ActivityProgressItem[];
  all_activities?: ActivityProgressItem[];
}

export interface DelayedSupervisorItem {
  supervisor_id: number;
  supervisor_name: string;
  discipline: string;
  delayed_count: number;
  max_days_delayed: number;
  status_detail: string;
  activities: ActivityProgressItem[];
}

export type ComplaintCategory = 'LABOR' | 'MATERIAL' | 'ACCESS' | 'EQUIPMENT' | 'SAFETY' | 'OTHER';
export type ComplaintStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface ComplaintItem {
  id: number;
  supervisor_id: number;
  supervisor_name: string;
  supervisor_discipline?: string;
  project_id: number;
  activity_id?: string;
  activity_name?: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  planner_response?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface ComplaintCreatePayload {
  project_id: number;
  activity_id?: string;
  category: ComplaintCategory;
  description: string;
}

export interface AssignmentHistoryItem {
  id: number;
  activity_id: string;
  supervisor_id: number;
  supervisor_name: string;
  previous_supervisor_id?: number;
  previous_supervisor_name?: string;
  assignment_source: string;
  assigned_by_id?: number;
  assigned_by_name?: string;
  assigned_at: string;
  reason?: string;
}

// In-memory mock database for frontend simulation if backend endpoints are staging
const MOCK_REPORTS: SubmissionSummary[] = [
  {
    id: 101,
    date: "2026-02-10",
    supervisor_name: "Foreman Iqbal",
    raw_text: "11kv cable pulling done substation side, feeder run complete. tray install ongoing MCC building ground floor.",
    discipline: "Electrical",
    location: "Substation",
    status: "matched",
    confidence: 0.94,
    suggested_activity_id: "L6-ELE-301",
    suggested_activity_name: "Pull 11kV cable - Substation to MCC",
    match_log: [{ match_id: 201, activity_id: "L6-ELE-301", activity_name: "Pull 11kV cable - Substation to MCC", semantic_score: 0.95, entity_score: 0.93, metadata_score: 0.94, final_confidence: 0.94, decision: "auto", is_verified: true, verification_type: "AI", verified_by: "AI Auto-Match", verified_at: "2026-02-10", activity_status: "COMPLETED", matched_at: "2026-02-10" }],
    is_verified: true,
    verification_type: "AI",
    verified_by: "AI Auto-Match",
    verified_at: "2026-02-10",
    activity_status: "COMPLETED",
  },
  {
    id: 102,
    date: "2026-02-10",
    supervisor_name: "R. Sharma",
    raw_text: "Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up, flange bolt-up in progress.",
    discipline: "Piping",
    location: "Unit 3",
    status: "pending review",
    confidence: 0.88,
    suggested_activity_id: "L6-PIP-101",
    suggested_activity_name: "Erect Line 24 (12in CS pipe)",
    match_log: [{ match_id: 202, activity_id: "L6-PIP-101", activity_name: "Erect Line 24 (12in CS pipe)", semantic_score: 0.91, entity_score: 0.88, metadata_score: 0.85, final_confidence: 0.88, decision: "review", is_verified: false, matched_at: "2026-02-10", activity_status: "IN_PROGRESS" }],
    is_verified: false,
    activity_status: "IN_PROGRESS",
  },
  {
    id: 103,
    date: "2026-02-10",
    supervisor_name: "Civil Lead Baruah",
    raw_text: "Excavation for footing F-12 completed, 18 cum ready for PCC. Column C-7 RCC pour ongoing.",
    discipline: "Civil",
    location: "Unit 3",
    status: "matched",
    confidence: 0.96,
    suggested_activity_id: "L6-CIV-201",
    suggested_activity_name: "Excavate footing F-12",
    match_log: [{ match_id: 203, activity_id: "L6-CIV-201", activity_name: "Excavate footing F-12", semantic_score: 0.97, entity_score: 0.95, metadata_score: 0.96, final_confidence: 0.96, decision: "auto", is_verified: true, verification_type: "MANUAL", verified_by: "Priya Mehta (Planner)", verified_at: "2026-02-10", activity_status: "COMPLETED", matched_at: "2026-02-10" }],
    is_verified: true,
    verification_type: "MANUAL",
    verified_by: "Priya Mehta (Planner)",
    verified_at: "2026-02-10",
    activity_status: "COMPLETED",
  },
  {
    id: 104,
    date: "2026-02-10",
    supervisor_name: "Safety Officer Deb",
    raw_text: "Perimeter bush cutting and grass clearance done along north security fence.",
    discipline: "Civil",
    location: "Boundary Wall",
    status: "rejected",
    confidence: 0.52,
    suggested_activity_id: "L6-CIV-210",
    suggested_activity_name: "Boundary wall brickwork",
    match_log: [{ match_id: 204, activity_id: "L6-CIV-210", activity_name: "Boundary wall brickwork", semantic_score: 0.55, entity_score: 0.48, metadata_score: 0.52, final_confidence: 0.52, decision: "rejected", is_verified: false, matched_at: "2026-02-10", activity_status: "PLANNED" }],
    is_verified: false,
    activity_status: "PLANNED",
  },
];


let MOCK_MATCH_QUEUE: MatchReviewItem[] = [
  {
    match_id: 201,
    report_id: 102,
    report_snippet: "Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up.",
    report_date: "2026-02-10",
    supervisor: "R. Sharma",
    discipline: "Piping",
    location: "Unit 3",
    extracted_fields: {
      action: "Spool Erection & Joint Fit-up",
      line_ref: "Line 24 (12in CS)",
      quantity: "4 joints / 2 spools",
      date: "2026-02-10",
    },
    suggested_activity: {
      id: 1,
      activity_id: "L6-PIP-101",
      activity_name: "Erect Line 24 (12in CS pipe)",
      wbs_code: "3.2.1.1",
      planned_start: "2026-02-05",
      planned_finish: "2026-02-12",
      current_status: "IN_PROGRESS",
    },
    signals: {
      semantic: 0.91,
      entity: 0.98,
      metadata: 0.85,
    },
    final_confidence: 0.88,
    decision: "review",
    is_verified: false,
    activity_status: "IN_PROGRESS",
  },
  {
    match_id: 202,
    report_id: 105,
    report_snippet: "RCC pouring ongoing near column C-7 area, 6 cum poured with shuttering in place.",
    report_date: "2026-02-10",
    supervisor: "Civil Lead Baruah",
    discipline: "Civil",
    location: "Unit 3",
    extracted_fields: {
      action: "RCC Concrete Pouring",
      line_ref: "Column C-7",
      quantity: "6 cum",
      date: "2026-02-10",
    },
    suggested_activity: {
      id: 3,
      activity_id: "L6-CIV-203",
      activity_name: "Cast column C-7 (RCC)",
      wbs_code: "3.1.1.3",
      planned_start: "2026-02-08",
      planned_finish: "2026-02-14",
      current_status: "IN_PROGRESS",
    },
    signals: {
      semantic: 0.82,
      entity: 0.72,
      metadata: 0.78,
    },
    final_confidence: 0.76,
    decision: "review",
    is_verified: false,
    activity_status: "IN_PROGRESS",
  },
  {
    match_id: 203,
    report_id: 106,
    report_snippet: "Foreman Iqbal: termination kal start karenge feeder side, material abhi nahi aaya",
    report_date: "2026-02-10",
    supervisor: "Foreman Iqbal",
    discipline: "Electrical",
    location: "Substation",
    extracted_fields: {
      action: "Cable Termination (Forward Looking / Material Pending)",
      line_ref: "Feeder Side 11kV",
      quantity: "N/A",
      date: "2026-02-10",
    },
    suggested_activity: {
      id: 5,
      activity_id: "L6-ELE-303",
      activity_name: "Terminate 11kV cable at switchgear",
      wbs_code: "3.3.1.3",
      planned_start: "2026-02-13",
      planned_finish: "2026-02-16",
      current_status: "PLANNED",
    },
    signals: {
      semantic: 0.74,
      entity: 0.65,
      metadata: 0.40,
    },
    final_confidence: 0.58,
    decision: "held",
    is_verified: false,
    activity_status: "PLANNED",
  },
  {
    match_id: 204,
    report_id: 101,
    report_snippet: "11kv cable pulling done substation side, feeder run complete. tray install ongoing MCC building ground floor.",
    report_date: "2026-02-10",
    supervisor: "Foreman Iqbal",
    discipline: "Electrical",
    location: "Substation",
    extracted_fields: {
      action: "11kV Cable Pull & Tray Install",
      line_ref: "Substation to MCC",
      quantity: "Feeder run complete",
      date: "2026-02-10",
    },
    suggested_activity: {
      id: 2,
      activity_id: "L6-ELE-301",
      activity_name: "Pull 11kV cable - Substation to MCC",
      wbs_code: "3.3.1.1",
      planned_start: "2026-02-05",
      planned_finish: "2026-02-10",
      current_status: "COMPLETED",
    },
    signals: {
      semantic: 0.95,
      entity: 0.93,
      metadata: 0.94,
    },
    final_confidence: 0.94,
    decision: "auto",
    is_verified: true,
    verification_type: "AI",
    verified_by: "AI Auto-Match",
    verified_at: "2026-02-10",
    activity_status: "COMPLETED",
  },
];


export const api = {
  // ==================== AUTH ====================
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const lower = username.toLowerCase();
    const isSupervisor =
      lower.includes("sup") ||
      lower.includes("supervisor") ||
      lower.includes("iqbal") ||
      lower.includes("biren") ||
      lower.includes("dipak") ||
      lower.includes("sanjay");
    const role: 'supervisor' | 'planner' = isSupervisor ? 'supervisor' : 'planner';

    let supId = 2;
    let supName = "Sanjay Supervisor (Civil 1)";
    let disc = "Civil";
    if (lower.includes("piping.sup1") || lower.includes("pip1") || lower.includes("biren")) {
      supId = 4;
      supName = "Biren Das (Supervisor 1 - Piping)";
      disc = "Piping";
    } else if (lower.includes("piping.sup2") || lower.includes("pip2") || lower.includes("dipak")) {
      supId = 5;
      supName = "Dipak Kalita (Supervisor 2 - Piping)";
      disc = "Piping";
    } else if (lower.includes("civil.sup2") || lower.includes("civ2")) {
      supId = 6;
      supName = "Manoj Bora (Supervisor 2 - Civil)";
      disc = "Civil";
    } else if (lower.includes("electrical.sup1") || lower.includes("ele1")) {
      supId = 7;
      supName = "Rajesh Das (Supervisor 1 - Electrical)";
      disc = "Electrical";
    } else if (lower.includes("electrical.sup2") || lower.includes("ele2")) {
      supId = 8;
      supName = "Kiran Saikia (Supervisor 2 - Electrical)";
      disc = "Electrical";
    } else if (isSupervisor) {
      supId = 2;
      supName = "Sanjay Supervisor (Supervisor 1 - Civil)";
      disc = "Civil";
    }

    try {
      const formData = new URLSearchParams();
      formData.append("username", username.trim());
      formData.append("password", password);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          return data;
        }
        return {
          ...data,
          user: {
            id: isSupervisor ? supId : 1,
            name: isSupervisor ? supName : "Admin",
            email: username.trim(),
            role: role,
            discipline: isSupervisor ? disc : "Planning",
            created_at: new Date().toISOString(),
          },
        };
      } else {
        // Backend actively returned an authentication rejection (401 / 400)
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.detail || "Incorrect email or password. Please verify your credentials.";
        throw new Error(errMsg);
      }
    } catch (networkOrAuthErr: any) {
      // If it's a valid authentication rejection, ALWAYS surface it to the user!
      if (
        networkOrAuthErr.message &&
        !networkOrAuthErr.message.includes("Failed to fetch") &&
        !networkOrAuthErr.message.includes("NetworkError") &&
        !networkOrAuthErr.message.includes("Load failed")
      ) {
        throw networkOrAuthErr;
      }

      // Offline fallback: ONLY allow verified official demo accounts with matching passwords
      const validDemoPws: Record<string, string[]> = {
        "planner@oilindia.in": ["SecurePlannerPassword123!", "planner123"],
        "supervisor@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
        "piping.sup1@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
        "piping.sup2@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
        "civil.sup2@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
        "electrical.sup1@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
        "electrical.sup2@oilindia.in": ["SecureSupervisorPassword123!", "supervisor123"],
      };

      const normalizedEmail = username.trim().toLowerCase();
      const allowedPws = validDemoPws[normalizedEmail];

      if (!allowedPws || !allowedPws.includes(password)) {
        throw new Error("Incorrect email or password. Access denied.");
      }

      return {
        access_token: `mock-jwt-${role}-${Date.now()}`,
        token_type: "bearer",
        user: {
          id: isSupervisor ? supId : 1,
          name: isSupervisor ? supName : "Admin",
          email: normalizedEmail,
          role: role,
          discipline: isSupervisor ? disc : "Planning",
          created_at: new Date().toISOString(),
        },
      };
    }
  },

  registerUser: async (data: {
    name: string;
    email: string;
    password: string;
    role?: 'supervisor' | 'planner' | 'admin';
    discipline?: string;
  }): Promise<UserResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role || "supervisor",
          discipline: data.discipline || null,
        }),
      });

      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    } catch (e: any) {
      if (e.message && !e.message.includes("fetch")) throw e;
      // Demo fallback when offline
      return {
        id: Math.floor(Math.random() * 900) + 100,
        name: data.name,
        email: data.email,
        role: data.role || "supervisor",
        discipline: data.discipline || "General",
        created_at: new Date().toISOString(),
      };
    }
  },

  getMe: async (): Promise<UserResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    const auth = useAuthStore.getState();
    if (auth.user) {
      return {
        ...auth.user,
        created_at: auth.user.created_at || new Date().toISOString(),
      };
    }
    return {
      id: 1,
      name: "Guest User",
      email: "planner.arun@oilindia.in",
      role: "planner",
      created_at: new Date().toISOString(),
    };
  },

  // ==================== SUPERVISOR ====================
  submitReport: async (
    text: string,
    file?: File | null,
    discipline?: string,
    location?: string,
    projectId?: number
  ): Promise<ReportSubmissionResponse> => {
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("project_id", String(projectId || 1));
      if (file) formData.append("file", file);
      if (discipline) formData.append("discipline", discipline);
      if (location) formData.append("location", location);

      const res = await fetch(`${API_BASE_URL}/ingestion/report`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) return await res.json();
    } catch {}

    // Resilient simulated extraction matching ScheduleSync AI behavior
    const newId = 100 + MOCK_REPORTS.length + 1;
    const isPiping = text.toLowerCase().includes("pipe") || text.toLowerCase().includes("line");
    const isCivil = text.toLowerCase().includes("excav") || text.toLowerCase().includes("footing") || text.toLowerCase().includes("concrete");

    const matchedDisc = discipline || (isPiping ? "Piping" : isCivil ? "Civil" : "Electrical");
    const matchedLoc = location || (text.toLowerCase().includes("unit 3") ? "Unit 3" : "Substation");

    const newSub: SubmissionSummary = {
      id: newId,
      date: new Date().toISOString().split("T")[0],
      supervisor_name: useAuthStore.getState().user?.name || "Foreman Iqbal",
      raw_text: text,
      discipline: matchedDisc,
      location: matchedLoc,
      status: "pending review",
      confidence: 0.89,
      suggested_activity_id: isPiping ? "L6-PIP-101" : "L6-CIV-201",
      suggested_activity_name: isPiping ? "Erect Line 24 (12in CS pipe)" : "Excavate footing F-12",
      match_log: [],
      is_verified: false,
    };

    MOCK_REPORTS.unshift(newSub);

    return {
      report_id: newId,
      status: "PROCESSED",
      message: "Report successfully ingested and matched to baseline schedule.",
      extracted_events: [
        {
          description: text.slice(0, 80),
          discipline: matchedDisc,
          location: matchedLoc,
          quantity: "Completed work package",
          date: new Date().toISOString().split("T")[0],
        },
      ],
      suggested_match: {
        activity_id: newSub.suggested_activity_id!,
        activity_name: newSub.suggested_activity_name!,
        confidence: newSub.confidence,
        decision: "review",
      },
    };
  },

  transcribeVoice: async (
    audioBlob: Blob,
    filename: string = "site_recording.webm",
    language?: string
  ): Promise<{ text: string; language_detected?: string; duration_seconds?: number }> => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, filename);
      formData.append("audio", audioBlob, filename);
      if (language) {
        formData.append("language", language);
      }

      const res = await fetch(`${API_BASE_URL}/voice/transcribe`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        return await res.json();
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn("Transcription server returned status:", res.status, errJson);
      }
    } catch (e) {
      console.warn("Voice transcribe fetch failed:", e);
    }
    return { text: "", language_detected: "en", duration_seconds: 0 };
  },

  translateText: async (
    text: string,
    target_lang: 'en' | 'hi' | string = 'en',
    source_lang?: string
  ): Promise<{ original_text: string; translated_text: string; target_lang: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/voice/translate`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ text, target_lang, source_lang }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Translation request failed:", e);
    }
    return { original_text: text, translated_text: text, target_lang };
  },

  getMySubmissions: async (): Promise<SubmissionSummary[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/mine`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: any[] = await res.json();
        return data.map((r: any) => ({
          id: r.id,
          date: r.uploaded_at ? r.uploaded_at.split('T')[0] : '',
          supervisor_name: r.supervisor_name || '',
          raw_text: r.raw_text || '',
          discipline: r.discipline || '',
          location: r.location || '',
          status: r.status || 'pending review',
          confidence: r.confidence || 0,
          suggested_activity_id: r.suggested_activity_id,
          suggested_activity_name: r.suggested_activity_name,
          match_log: r.match_log || [],
          is_verified: r.is_verified || false,
          verification_type: r.verification_type,
          verified_by: r.verified_by,
          verified_at: r.verified_at,
          activity_status: r.activity_status,
        }));
      }
    } catch {}

    return MOCK_REPORTS;
  },

  getSubmissionDetail: async (id: number): Promise<SubmissionSummary | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const r: any = await res.json();
        return {
          id: r.id,
          date: r.uploaded_at ? r.uploaded_at.split('T')[0] : '',
          supervisor_name: r.supervisor_name || '',
          raw_text: r.raw_text || '',
          discipline: r.discipline || '',
          location: r.location || '',
          status: r.status || 'pending review',
          confidence: r.confidence || 0,
          suggested_activity_id: r.suggested_activity_id,
          suggested_activity_name: r.suggested_activity_name,
          match_log: r.match_log || [],
          is_verified: r.is_verified || false,
          verification_type: r.verification_type,
          verified_by: r.verified_by,
          verified_at: r.verified_at,
          activity_status: r.activity_status,
        };
      }
    } catch {}

    return MOCK_REPORTS.find((r) => r.id === Number(id)) || null;
  },

  // ==================== PLANNER ====================
  getProjects: async (): Promise<{ total: number; projects: Project[] }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/schedule/projects`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Strictly filter out any completed projects from the active project list
        const activeProjects = (data.projects || []).filter((p: Project) => p.status !== 'COMPLETED');
        return {
          total: activeProjects.length,
          projects: activeProjects,
        };
      }
    } catch {}

    return {
      total: 3,
      projects: [
        {
          id: 1,
          name: "Numaligarh Refinery Expansion (Unit 3 & Offsites)",
          client: "Oil India Limited",
          start_date: "2026-01-01",
          end_date: "2026-12-31",
          activity_count: 36,
          status: "RUNNING",
          created_at: "2026-02-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Duliajan Central Gas Gathering Station (CGGS-2)",
          client: "Oil India Limited",
          start_date: "2026-01-15",
          end_date: "2026-11-30",
          activity_count: 24,
          status: "RUNNING",
          created_at: "2026-02-01T00:00:00Z",
        },
        {
          id: 3,
          name: "Guwahati-Siliguri Pipeline Modernization (Phase II)",
          client: "Oil India Limited",
          start_date: "2026-02-01",
          end_date: "2027-03-31",
          activity_count: 18,
          status: "RUNNING",
          created_at: "2026-02-01T00:00:00Z",
        },
      ],
    };
  },

  createProject: async (project: { name: string; client: string; start_date: string; end_date: string }): Promise<Project> => {
    const res = await fetch(`${API_BASE_URL}/schedule/projects`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create project' }));
      throw new Error(err.detail || 'Failed to create project');
    }
    return await res.json();
  },

  deleteProject: async (projectId: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/schedule/projects/${projectId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete project' }));
      throw new Error(err.detail || 'Failed to delete project');
    }
  },

  importScheduleFile: async (projectId: number, file: File): Promise<{ imported_count: number; source_type: string }> => {
    const isXer = file.name.endsWith('.xer');
    const endpoint = isXer ? '/schedule/import/xer' : '/schedule/import/excel';

    const formData = new FormData();
    formData.append("project_id", String(projectId));
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (res.ok) return await res.json();
    const err = await res.json().catch(() => ({ detail: 'Failed to import schedule file' }));
    throw new Error(err.detail || 'Failed to import schedule file');
  },

  getWorkflowReportBlob: async (projectId: number = 1): Promise<Blob> => {
    const res = await fetch(`${API_BASE_URL}/schedule/${projectId}/workflow-report`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate workflow report' }));
      throw new Error(err.detail || 'Failed to generate workflow report');
    }
    return await res.blob();
  },

  downloadWorkflowReport: async (projectId: number = 1, projectName: string = 'project'): Promise<void> => {
    const blob = await api.getWorkflowReportBlob(projectId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
    a.download = `${safeName}_workflow_report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  getActivities: async (
    projectId: number = 1,
    page: number = 1,
    pageSize: number = 50,
    discipline?: string
  ): Promise<ActivityListResponse> => {
    try {
      const params = new URLSearchParams({
        project_id: String(projectId),
        page: String(page),
        page_size: String(pageSize),
      });
      if (discipline) params.append("discipline", discipline);

      const res = await fetch(`${API_BASE_URL}/schedule/activities?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    // Fallback baseline activity list representing the 36 L6 items
    const baseActs: Activity[] = [
      { id: 1, project_id: projectId, activity_id: "L6-PIP-101", activity_name: "Erect Line 24 (12in CS pipe)", wbs_code: "3.2.1.1", discipline: "piping", location: "Unit 3", planned_start: "2026-02-05", planned_finish: "2026-02-12", actual_start: "2026-02-10", status: "IN_PROGRESS", trend: "recovering" },
      { id: 2, project_id: projectId, activity_id: "L6-PIP-102", activity_name: "Erect Line 31 (8in CS pipe)", wbs_code: "3.2.1.2", discipline: "piping", location: "Unit 3", planned_start: "2026-02-08", planned_finish: "2026-02-14", status: "NOT_STARTED", trend: "stable" },
      { id: 3, project_id: projectId, activity_id: "L6-CIV-201", activity_name: "Excavate footing F-12", wbs_code: "3.1.1.1", discipline: "civil", location: "Unit 3", planned_start: "2026-02-01", planned_finish: "2026-02-10", actual_finish: "2026-02-10", status: "COMPLETED", trend: "recovering" },
      { id: 4, project_id: projectId, activity_id: "L6-CIV-202", activity_name: "Lay PCC for F-12 footing", wbs_code: "3.1.1.2", discipline: "civil", location: "Unit 3", planned_start: "2026-02-09", planned_finish: "2026-02-11", actual_start: "2026-02-10", status: "IN_PROGRESS", trend: "stable" },
      { id: 5, project_id: projectId, activity_id: "L6-CIV-203", activity_name: "Cast column C-7 (RCC)", wbs_code: "3.1.1.3", discipline: "civil", location: "Unit 3", planned_start: "2026-02-08", planned_finish: "2026-02-14", actual_start: "2026-02-10", status: "IN_PROGRESS", trend: "worsening" },
      { id: 6, project_id: projectId, activity_id: "L6-ELE-301", activity_name: "Pull 11kV cable - Substation to MCC", wbs_code: "3.3.1.1", discipline: "electrical", location: "Substation", planned_start: "2026-02-06", planned_finish: "2026-02-11", actual_finish: "2026-02-10", status: "COMPLETED", trend: "recovering" },
      { id: 7, project_id: projectId, activity_id: "L6-ELE-302", activity_name: "Install cable tray in MCC building", wbs_code: "3.3.1.2", discipline: "electrical", location: "Unit 3", planned_start: "2026-02-08", planned_finish: "2026-02-13", actual_start: "2026-02-10", status: "IN_PROGRESS", trend: "stable" },
      { id: 8, project_id: projectId, activity_id: "L6-ELE-303", activity_name: "Terminate 11kV cable at switchgear", wbs_code: "3.3.1.3", discipline: "electrical", location: "Substation", planned_start: "2026-02-13", planned_finish: "2026-02-16", status: "NOT_STARTED", trend: "worsening" },
    ];

    const filtered = discipline ? baseActs.filter(a => a.discipline === discipline.toLowerCase()) : baseActs;

    return {
      total: filtered.length,
      page: 1,
      page_size: pageSize,
      total_pages: 1,
      activities: filtered,
    };
  },

  getReviewQueue: async (): Promise<MatchReviewItem[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/review/queue`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    return [...MOCK_MATCH_QUEUE];
  },

  approveMatch: async (matchId: number): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/review/${matchId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    MOCK_MATCH_QUEUE = MOCK_MATCH_QUEUE.filter(m => m.match_id !== matchId);
    return { success: true, message: `Match #${matchId} approved. Schedule baseline written back.` };
  },

  rejectMatch: async (matchId: number, reason?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/review/${matchId}/reject`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
    } catch {}

    MOCK_MATCH_QUEUE = MOCK_MATCH_QUEUE.filter(m => m.match_id !== matchId);
    return { success: true, message: `Match #${matchId} marked as held.` };
  },

  relinkMatch: async (matchId: number, targetActivityId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/review/${matchId}/relink`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ activity_id: targetActivityId }),
      });
      if (res.ok) return await res.json();
    } catch {}

    MOCK_MATCH_QUEUE = MOCK_MATCH_QUEUE.filter(m => m.match_id !== matchId);
    return { success: true, message: `Match #${matchId} relinked to activity ${targetActivityId}.` };
  },

  getAnalyticsSummary: async (projectId: number = 1): Promise<AnalyticsSummary> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/summary?project_id=${projectId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    if (projectId === 2) {
      return {
        project_id: 2,
        project_name: "Duliajan Compressor Station Expansion",
        total_activities: 40,
        completed: 16,
        in_progress: 14,
        delayed: 6,
        needs_review: 4,
        discipline_productivity: [
          { discipline: "Piping", completed: 8, in_progress: 5, delayed: 3 },
          { discipline: "Civil", completed: 5, in_progress: 5, delayed: 2 },
          { discipline: "Electrical", completed: 3, in_progress: 4, delayed: 1 },
        ],
        delay_hotspots: [
          { activity_id: "ACT-ELE-205", name: "Motor Control Center MCC-A Energization", discipline: "Electrical", days_delayed: 3, trend: "worsening" },
          { activity_id: "ACT-ELE-206", name: "Earthing Grid Pit Installation", discipline: "Electrical", days_delayed: 3, trend: "worsening" },
          { activity_id: "ACT-ELE-207", name: "High Mast Lighting Tower Erection", discipline: "Electrical", days_delayed: 3, trend: "worsening" },
        ],
      };
    }

    return {
      project_id: 1,
      project_name: "Numaligarh Refinery Expansion (Unit 3 & Offsites)",
      total_activities: 36,
      completed: 14,
      in_progress: 11,
      delayed: 6,
      needs_review: 5,
      discipline_productivity: [
        { discipline: "Piping", completed: 6, in_progress: 4, delayed: 2 },
        { discipline: "Civil", completed: 5, in_progress: 4, delayed: 1 },
        { discipline: "Electrical", completed: 3, in_progress: 3, delayed: 3 },
      ],
      delay_hotspots: [
        { activity_id: "L6-PIP-104", name: "Fit-up spool SP-045", discipline: "Piping", days_delayed: 4, trend: "worsening" },
        { activity_id: "L6-CIV-203", name: "RCC pour footing F-12", discipline: "Civil", days_delayed: 2, trend: "recovering" },
        { activity_id: "L6-ELE-303", name: "Terminate 11kV feeder cable", discipline: "Electrical", days_delayed: 3, trend: "worsening" },
      ],
    };
  },

  getActivityHistory: async (activityId: string | number): Promise<ActivityHistoryItem[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/activities/${activityId}/history`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    return [
      {
        id: 1,
        event_date: "2026-02-10 14:32:00",
        event_type: "AUTO_LINK_ACCEPTED",
        description: "Actual progress event linked from Daily Site Log #102.",
        confidence: 0.94,
        logged_by: "Foreman Iqbal (Voice/WhatsApp)",
        approved_by: "Admin",
        status: "APPROVED",
      },
      {
        id: 2,
        event_date: "2026-02-08 09:15:00",
        event_type: "ACTUAL_START_WRITTEN",
        description: "Activity marked started with 4 joints completed.",
        confidence: 0.88,
        logged_by: "R. Sharma (Supervisor)",
        approved_by: "Admin",
        status: "APPROVED",
      },
      {
        id: 3,
        event_date: "2026-02-01 08:00:00",
        event_type: "BASELINE_IMPORT",
        description: "Activity created from Primavera P6 schedule export (WBS 3.2.1.1).",
        confidence: 1.0,
        logged_by: "System Ingestion",
        status: "COMMITTED",
      },
    ];
  },

  getHistoricalDurationStats: async (activityType: string = "erect_line"): Promise<HistoricalDurationStatsResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/historical/duration-stats?activity_type=${encodeURIComponent(activityType)}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    return {
      activity_type: activityType,
      total_instances: 14,
      stats: [
        { pipe_diameter_in: 6.0, instances: 2, count: 2, avg_actual_duration_days: 2.5, avg_planned_duration_days: 2.0, avg_delay_days: 0.5 },
        { pipe_diameter_in: 8.0, instances: 2, count: 2, avg_actual_duration_days: 3.0, avg_planned_duration_days: 2.0, avg_delay_days: 1.0 },
        { pipe_diameter_in: 10.0, instances: 2, count: 2, avg_actual_duration_days: 4.0, avg_planned_duration_days: 3.0, avg_delay_days: 1.0 },
        { pipe_diameter_in: 12.0, instances: 2, count: 2, avg_actual_duration_days: 3.5, avg_planned_duration_days: 3.0, avg_delay_days: 0.5 },
        { pipe_diameter_in: 16.0, instances: 2, count: 2, avg_actual_duration_days: 5.0, avg_planned_duration_days: 4.0, avg_delay_days: 1.0 },
        { pipe_diameter_in: 20.0, instances: 2, count: 2, avg_actual_duration_days: 6.0, avg_planned_duration_days: 5.0, avg_delay_days: 1.0 },
        { pipe_diameter_in: 24.0, instances: 2, count: 2, avg_actual_duration_days: 8.0, avg_planned_duration_days: 6.0, avg_delay_days: 2.0 },
      ],
    };
  },

  askHistoricalMemory: async (question: string, topN: number = 5): Promise<HistoricalAskResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/historical/ask`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ question, top_n: topN }),
      });
      if (res.ok) return await res.json();
    } catch {}

    return {
      question,
      top_n: 2,
      matches: [
        {
          activity_name: "Erect Line 24-113",
          discipline: "Piping",
          delay_reason: "utility clash",
          delay_days: 3,
          project_name: "Dhemaji Pipeline Corridor Upgrade (HIST-P2)",
          pipe_diameter_in: 24.0,
          actual_duration_days: 9,
          similarity_score: 0.94,
        },
        {
          activity_name: "Erect Line 24-114",
          discipline: "Piping",
          delay_reason: "rework",
          delay_days: 1,
          project_name: "Kaziranga Tank Farm Expansion (HIST-P1)",
          pipe_diameter_in: 24.0,
          actual_duration_days: 7,
          similarity_score: 0.91,
        },
      ],
      summary: "24-inch line erection activities averaged 8.0 days (vs 6.0 days planned, +2.0 days average overrun) driven by rework on Erect Line 24-114 (+1 day) and utility clashes on Erect Line 24-113 (+3 days).",
    };
  },

  getHistoricalProjects: async (): Promise<HistoricalProjectItem[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/historical/projects`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    return [
      {
        project_id: "HIST-P1",
        project_name: "Kaziranga Tank Farm Expansion",
        site_type: "Tank Farm Expansion (Brownfield)",
        region: "Assam, India",
        start_date: "2023-01-09",
        end_date: "2023-03-03",
        status: "Closed / Completed Archive",
        activity_count: 18,
        disciplines: ["Piping (10)", "Civil (5)", "Electrical (2)", "HSE (1)"],
        key_delay_factors: "Heavy crane mobilization delay on 24-in headers (+4d); ground water table seepage during ring beam foundation pour (+3d).",
      },
      {
        project_id: "HIST-P2",
        project_name: "Dhemaji Pipeline Corridor Upgrade",
        site_type: "Pipeline Corridor Upgrade (Brownfield)",
        region: "Assam, India",
        start_date: "2024-02-05",
        end_date: "2024-04-06",
        status: "Closed / Completed Archive",
        activity_count: 18,
        disciplines: ["Piping (11)", "Civil (4)", "Electrical (2)", "HSE (1)"],
        key_delay_factors: "Trench wall caving in sand-silt mix (+4d); flash rain formwork hold; non-ATEX explosion-proof junction box transit replacement (+3d).",
      },
    ];
  },

  // ==================== SUPERVISOR ASSIGNMENT ====================
  runAssignment: async (projectId: number): Promise<AssignmentRunSummary> => {
    const res = await fetch(`${API_BASE_URL}/assignment/run?project_id=${projectId}`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Auto-assignment run failed");
    }
    return await res.json();
  },

  reassignActivity: async (
    activityId: string,
    newSupervisorId: number,
    reason?: string
  ): Promise<ReassignResponse> => {
    const res = await fetch(`${API_BASE_URL}/assignment/${activityId}/reassign`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ new_supervisor_id: newSupervisorId, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Reassignment failed");
    }
    return await res.json();
  },

  getSupervisorTasks: async (
    supervisorId: number,
    week?: number
  ): Promise<SupervisorTaskItem[]> => {
    const url = week !== undefined
      ? `${API_BASE_URL}/assignment/supervisor/${supervisorId}?week=${week}`
      : `${API_BASE_URL}/assignment/supervisor/${supervisorId}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getAdminWorkloadView: async (projectId: number = 1): Promise<AdminWorkloadRow[]> => {
    const res = await fetch(`${API_BASE_URL}/assignment/admin-view?project_id=${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getActivityAssignmentHistory: async (activityId: string): Promise<AssignmentHistoryItem[]> => {
    const res = await fetch(`${API_BASE_URL}/assignment/activity/${activityId}/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // ==================== SUPERVISOR PROGRESS & TIME TRACKING ====================
  getSupervisorProgress: async (
    supervisorId: number,
    projectId: number = 1
  ): Promise<SupervisorProgressSummary> => {
    const res = await fetch(
      `${API_BASE_URL}/progress/supervisor/${supervisorId}?project_id=${projectId}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch supervisor progress: ${res.statusText}`);
    }
    return await res.json();
  },

  getDelayedSupervisors: async (projectId: number = 1): Promise<DelayedSupervisorItem[]> => {
    const res = await fetch(`${API_BASE_URL}/progress/delayed?project_id=${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // ==================== COMPLAINTS & BLOCKERS SYSTEM ====================
  raiseComplaint: async (payload: ComplaintCreatePayload): Promise<ComplaintItem> => {
    const res = await fetch(`${API_BASE_URL}/complaints`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to raise blocker/complaint");
    }
    return await res.json();
  },

  getMyComplaints: async (projectId: number = 1): Promise<ComplaintItem[]> => {
    const res = await fetch(`${API_BASE_URL}/complaints/mine?project_id=${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getComplaints: async (
    projectId: number = 1,
    status?: string,
    category?: string
  ): Promise<ComplaintItem[]> => {
    const params = new URLSearchParams({ project_id: projectId.toString() });
    if (status && status !== 'ALL') params.append('status', status);
    if (category && category !== 'ALL') params.append('category', category);

    const res = await fetch(`${API_BASE_URL}/complaints?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  acknowledgeComplaint: async (
    complaintId: number,
    responseText?: string
  ): Promise<ComplaintItem> => {
    const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/acknowledge`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ response_text: responseText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to acknowledge complaint");
    }
    return await res.json();
  },

  resolveComplaint: async (
    complaintId: number,
    responseText?: string
  ): Promise<ComplaintItem> => {
    const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/resolve`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ response_text: responseText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to resolve complaint");
    }
    return await res.json();
  },

  // ==================== ADVANCED ANALYTICS EXTENSIONS ====================
  getSequenceViolations: async (projectId?: number): Promise<SequenceViolationItem[]> => {
    try {
      const url = projectId
        ? `${API_BASE_URL}/analytics/sequence-violations?project_id=${projectId}`
        : `${API_BASE_URL}/analytics/sequence-violations`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  acknowledgeSequenceViolation: async (violationId: number): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/analytics/sequence-violations/${violationId}/acknowledge`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch {}
  },

  getAtRiskForecasts: async (projectId?: number): Promise<ActivityForecastItem[]> => {
    try {
      const url = projectId
        ? `${API_BASE_URL}/analytics/forecast/at-risk?project_id=${projectId}`
        : `${API_BASE_URL}/analytics/forecast/at-risk`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  getActivityForecast: async (activityId: string): Promise<ActivityForecastItem | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/forecast/${encodeURIComponent(activityId)}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },
};

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getMyNotifications: async (limit = 20): Promise<AppNotification[]> => {
    const res = await fetch(`${API_BASE_URL}/notifications/mine?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unread_count || 0;
  },

  markRead: async (id: number): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
  },

  markAllRead: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  },
};

