# 🎬 ScheduleSync (SIH26122) — Master UI Page-by-Page Demo Script

> **Target Project**: Oil India Limited (OIL) — Numaligarh Refinery Expansion (NRL Unit 3 & Offsites)  
> **System**: ScheduleSync · Multi-Modal AI Data Capture & Primavera P6 Schedule-Linking Engine  
> **Purpose**: Complete presentation script covering **every single page of the UI** across both the **Central Planner Cockpit** and the **Field Supervisor Mobile PWA**.

---

## 🔑 Demo Access & Login Credentials

| Role | Route URL | Login Email | Login Password |
| :--- | :--- | :--- | :--- |
| **Central Planner / Admin** | `/login` | `planner@oilindia.in` | `SecurePlannerPassword123!` |
| **Site Supervisor (Civil)** | `/supervisor/login` | `supervisor@oilindia.in` | `SecureSupervisorPassword123!` |
| **Site Supervisor (Piping)** | `/supervisor/login` | `piping.sup1@oilindia.in` | `SecureSupervisorPassword123!` |
| **Site Supervisor (Electrical)** | `/supervisor/login` | `electrical.sup1@oilindia.in` | `SecureSupervisorPassword123!` |

---

# SECTION 1: Central Planner & Admin Cockpit

---

### Page 1: Admin & Planner Login
- **URL**: `/login` (or `/admin/login`)
- **Screen Action**: Show the clean white login card with the official **Oil India Limited** emblem, enter planner credentials, and click **Sign In**.
- **Spoken Script**:
  > *"We begin at the Central Planner authentication portal. ScheduleSync enforces strict role isolation — site supervisors cannot access administrative schedule controls, and enterprise planners have dedicated oversight. Logging in with our Lead Planner credentials takes us directly into the heart of the project."*

---

### Page 2: Project Setup & Baseline Ingestion
- **URL**: `/planner/setup` (or `/planner/ingestion`)
- **Screen Action**: Show the project configuration card, project metadata (*Numaligarh Refinery Expansion - Unit 3*), Primavera P6 baseline ingestion summary, and the 36 active WBS schedule items.
- **Spoken Script**:
  > *"Here on the Project Setup and Baseline Ingestion page, enterprise Primavera P6 schedule baselines are loaded into ScheduleSync. The system ingests the hierarchical Work Breakdown Structure, activity predecessors, planned dates, and disciplines. Each baseline item is vectorized and indexed locally into high-dimensional semantic embeddings, preparing the project for real-time automated progress linking."*

---

### Page 3: Planner Review Queue (Central Triage)
- **URL**: `/planner/review`
- **Screen Action**: Show incoming field reports, filtering by confidence tiers (*Auto-Linked ≥90%*, *Needs Review 70%–90%*, *Held <70%*). Point to the live cards with supervisor voice notes, photos, and confidence badges.
- **Spoken Script**:
  > *"This is the Planner Review Queue — the central triage cockpit for all multi-modal field submissions. Rather than waiting weeks for contractor spreadsheets, reports stream here in real time from site supervisors. Our tiered governance auto-approves reports with 90% confidence or higher, while borderline reports between 70% and 90% arrive here for single-click planner sign-off, ensuring total control over the master schedule."*

---

### Page 4: Match Review & 3-Signal Confidence Breakdown
- **URL**: `/planner/review/:id` (Click any candidate report in the queue)
- **Screen Action**: Scroll through the raw field note, the attached audio player (*'voic rakih'*), the extracted entities (discipline, location, equipment tags), and hover over the **3-Signal Confidence Score** breakdown. Click **Approve & Commit to Schedule**.
- **Spoken Script**:
  > *"Clicking into any report opens the Match Review Breakdown. Here you see complete mathematical explainability: our 3-Signal Hybrid Engine fuses 45% dense semantic similarity, 35% structured entity overlap powered by Google Gemini, and 20% Primavera WBS metadata context. Planners can listen to the supervisor's original site audio note, verify the matched activity, and approve the progress write-back with a single click."*

---

### Page 5: Master Schedule & Interactive Gantt Chart
- **URL**: `/planner/schedule`
- **Screen Action**: Zoom into the interactive Frappe Gantt chart, toggling between Day, Week, and Month views. Click on an activity to reveal its baseline versus actual progress, and point out an **Out-of-Sequence Predecessor Violation** badge.
- **Spoken Script**:
  > *"The Schedule view brings the project timeline alive. Verified site progress dynamically updates baseline progress bars against physical actuals. Crucially, ScheduleSync enforces predecessor sequence logic: if a crew logs progress on hydrotesting while pipe erection is still incomplete, the system immediately flags an Out-of-Sequence Sequence Violation, preventing catastrophic rework."*

---

### Page 6: Supervisor Workload & Task Allocation
- **URL**: `/planner/workload`
- **Screen Action**: Show the supervisor cards across Civil, Piping, and Electrical disciplines. Show active assigned activities, completion rates, and the 1-click reassignment modal.
- **Spoken Script**:
  > *"On the Supervisor Workload page, project managers can track and balance field assignments across all active site supervisors. Activities are automatically distributed based on discipline and site sector. Planners can reassign overloaded tasks or assign newly unblocked schedule items directly to available field engineers."*

---

### Page 7: Site Operational Blockers & Automated HSE Safety Tickets
- **URL**: `/planner/complaints`
- **Screen Action**: Show open blocker tickets submitted by supervisors (e.g. crane breakdown, permit delays), and highlight tickets with the red **HSE Safety** badge auto-tagged by AI. Click **Resolve / Update Status**.
- **Spoken Script**:
  > *"This is the Complaints and HSE Safety Panel. When supervisors encounter site bottlenecks — like crane unavailability or permit delays — they log them directly from the field. Additionally, our natural language pipeline automatically scans field notes for safety hazard keywords like 'PPE missing', 'gas leak', or 'spill', auto-generating urgent HSE compliance tickets so management can resolve blockers before they trigger schedule delays."*

---

### Page 8: Progress Analytics & S-Curve Forecasting
- **URL**: `/planner/analytics`
- **Screen Action**: Show the project S-Curve comparing Planned Baseline Cumulative Progress against Actual Progress, velocity trends, and sequence violation logs.
- **Spoken Script**:
  > *"The Analytics Dashboard generates real-time project S-Curves, tracking earned value velocity against baseline milestones. Planners can spot physical delivery drift weeks before it reflects on monthly contractor invoices, turning backward-looking reporting into predictive project governance."*

---

### Page 9: Historical Memory & Duration Risk Forecasting
- **URL**: `/planner/historical`
- **Screen Action**: Show the RAG retrieval drawer with 36 completed refinery benchmark activities. Click an activity to show the historical average duration versus current site estimate.
- **Spoken Script**:
  > *"The Historical Memory Panel leverages past project benchmarks from previous NRL and Oil India expansion phases. Using retrieval-augmented intelligence, the system compares current site progress against historical task durations, alerting planners if an activity is trending 20% slower than historical averages for that exact discipline."*

---

# SECTION 2: Field Supervisor Mobile PWA

---

### Page 10: Dedicated Field Supervisor Login
- **URL**: `/supervisor/login`
- **Screen Action**: Switch view to mobile screen dimensions (390×844 px). Show the mobile-first login card with the site link badge, enter supervisor credentials (`supervisor@oilindia.in`), and log in.
- **Spoken Script**:
  > *"Now let’s step into the shoes of the site supervisor on the refinery floor. Designed specifically for outdoor sunlight and one-handed operation on mobile devices, supervisors log in through this streamlined portal."*

---

### Page 11: Supervisor Home & Daily Task Overview
- **URL**: `/supervisor`
- **Screen Action**: Show the top bar with the **Oil India logo**, **Language Toggle (हिन्दी / English)**, and the **Install App (ऐप इंस्टॉल)** button. Point out the **Delayed Activities Pop-Up Alert** and filter assigned activities by *In Progress*, *Delayed*, and *Completed*.
- **Spoken Script**:
  > *"The Supervisor Home Screen provides an immediate summary of today's assigned tasks. If critical path activities are delayed, an interactive pop-up immediately alerts the supervisor. With one tap on the top bar, the entire interface instantly switches between English and Hindi. Notice also the Install App option, which allows supervisors to install ScheduleSync as a native mobile app on both iPhone and Android."*

---

### Page 12: iPhone & Android PWA Installation Modal
- **URL**: Click the **Install App / ऐप इंस्टॉल** button in header or banner.
- **Screen Action**: Show the tabbed modal displaying tailored step-by-step instructions for **Android** (3-dots menu → Install app) and **iPhone** (Safari Share icon → Add to Home Screen).
- **Spoken Script**:
  > *"Clicking Install opens our device-aware installation guide. On Android, it triggers native one-tap installation. On iPhones, it provides clear, visual instructions to Add to Home Screen via Safari. Once launched from the home screen, the app runs in full-screen standalone mode with zero browser chrome."*

---

### Page 13: Log Field Progress (Voice, Photo, Text & Audio Retention)
- **URL**: `/supervisor/log`
- **Screen Action**: 
  1. Tap the red **Microphone** button to speak (or tap a quick chip like *Line 24 Piping*).
  2. Watch live interim speech-to-text transcription appear in the notes box.
  3. Show the green audio player badge proving the audio note is saved (*'voic rakih'*).
  4. Tap the **1-Click Translate** button (Hindi ➔ English).
- **Spoken Script**:
  > *"Logging field progress takes less than 45 seconds. Supervisors simply tap the microphone and speak naturally in Hindi or English. Our hybrid speech pipeline captures the dictation using browser Web Speech and Faster-Whisper, transcribing the work details while safely preserving the original voice recording as an audit-proof attachment. The supervisor can also tap the 1-Click Translation button to preview the English log before submitting."*

---

### Page 14: Zero-Connectivity Offline Queue (IndexedDB Demo)
- **URL**: `/supervisor/log`
- **Screen Action**: 
  1. Open DevTools and switch Network to **Offline** (or toggle Airplane Mode).
  2. Tap **Submit Report**.
  3. Point to the amber status badge: **'Queued — will send when online'**.
  4. Switch Network back to **Online** — show the background auto-sync confirmation toast!
- **Spoken Script**:
  > *"Remote refinery sectors frequently suffer from complete cellular dead zones. ScheduleSync is built 100% offline-first. When submitted offline, reports and audio files are securely saved in the local IndexedDB queue. As soon as connectivity is restored, our Background Sync manager automatically dispatches the queue to the backend and master schedule with zero data loss."*

---

### Page 15: Site Drawings & Field Documents Repository
- **URL**: `/supervisor/files`
- **Screen Action**: Show the searchable repository with tabs for *Drawings*, *DPRs*, *Inspection Photos*, and *Quality/HSE Permits*. Tap an engineering drawing to open the detail preview card.
- **Spoken Script**:
  > *"Through the Site Files page, supervisors can instantly pull up the latest engineering P&IDs, isometric drawings, and BBS sheets right from their phone, eliminating the need to carry bulky paper rolls across the construction site."*

---

### Page 16: Submissions History & Verification Status
- **URL**: `/supervisor/submissions`
- **Screen Action**: Show the list of past supervisor submissions with real-time status pills (*Matched*, *Pending Review*, *Rejected*).
- **Spoken Script**:
  > *"The Submissions History page gives supervisors transparent tracking over every report they have logged. They can see in real time which activities were auto-matched by AI and which were verified by the Central Planner."*

---

### Page 17: Submission Detail & Audit Verification
- **URL**: `/supervisor/submissions/:id` (Click any submission card)
- **Screen Action**: Scroll through the matched activity details, the original field notes, and the verified date and method.
- **Spoken Script**:
  > *"In the Submission Detail view, supervisors can review the exact Primavera schedule activity their work was linked to, providing complete two-way trust between site teams and central project controls."*

---

### 🏁 Conclusion & Closing Callout
- **Screen Action**: Zoom back to the dashboard or show the dual-screen side-by-side view (Mobile Supervisor PWA on left, Central Planner Gantt on right).
- **Spoken Script**:
  > *"From offline voice dictation on the refinery floor to automated Primavera P6 schedule updates in the boardroom, ScheduleSync delivers real-time visibility, automated sequence protection, and verifiable schedule certainty for Oil India Limited. Thank you!"*
