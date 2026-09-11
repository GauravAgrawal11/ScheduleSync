# 🎬 ScheduleSync (SIH26122) — Official 2-Minute Demo Video Script

> **Project**: ScheduleSync · AI-Powered Multi-Modal Site Progress Capture & Schedule-Linking Layer  
> **Target Enterprise**: Oil India Limited (OIL) / Numaligarh Refinery Expansion Project (NRL Unit 3)  
> **Total Duration**: 2 Minutes (120 Seconds)  
> **Format Breakdown**:
> - **Part 1 (0:00 – 1:00)**: Central Planner / Admin Cockpit (Desktop View)
> - **Part 2 (1:00 – 2:00)**: Field Supervisor Mobile PWA (Mobile / Field Execution View)

---

## 🔑 Demo Access & Test Credentials

| Portal Role | URL Path | Login Email | Login Password | Key Features to Show |
| :--- | :--- | :--- | :--- | :--- |
| **Central Planner / Admin** | `/login` or `/planner/review` | `planner@oilindia.in` | `SecurePlannerPassword123!` | Review Queue, 3-Signal Fusion Score, Baseline Gantt, Violations, Workload, Complaints |
| **Field Supervisor (Civil)** | `/supervisor/login` or `/supervisor` | `supervisor@oilindia.in` | `SecureSupervisorPassword123!` | PWA Install, Hindi/English Toggle, Voice Dictation, Offline Sync, Delayed Alert |
| **Field Supervisor (Piping)** | `/supervisor/login` or `/supervisor` | `piping.sup1@oilindia.in` | `SecureSupervisorPassword123!` | Piping activities, spool erection progress logging, audio attachment |

*Local development base URL: `http://localhost:5173` | Production Vercel URL: Your deployed Vercel domain.*

---

## ⏱️ Video Script Matrix (Timestamp-by-Timestamp)

### Part 1: Central Planner / Admin Cockpit (0:00 – 1:00)

| Time | On-Screen Action (Video Visuals) | Spoken Voiceover (Exact Audio Script) | Key Engineering Concepts |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:10** | **1.** Open the Planner Login page (`/login`).<br>**2.** Show official Oil India Limited branding & insignia.<br>**3.** Click **Sign In** and land on the **Planner Cockpit** (`/planner/review`). | *"Welcome to ScheduleSync — our AI-powered site progress capture and schedule-linking system built for Oil India Limited's Numaligarh Refinery Expansion. In mega-scale capital projects, reconciling daily site reports with master Primavera P6 schedules takes 7 to 14 days. ScheduleSync eliminates this delay completely."* | • Enterprise Role-Based Access<br>• Real-Time Data Pipeline |
| **0:10 – 0:25** | **1.** Point cursor to the **Planner Review Queue** (`/planner/review`).<br>**2.** Click a candidate report to open **Match Review Breakdown** (`/planner/review/:id`).<br>**3.** Hover over the **3-Signal Fusion Score** breakdown (45% Semantic, 35% Entity, 20% WBS). | *"Incoming field reports — whether voice, scans, or text — are analyzed by our 3-signal hybrid engine: 45% dense semantic similarity, 35% entity extraction with Google Gemini, and 20% Primavera WBS metadata validation. Reports with confidence over 90% auto-link directly to P6 baselines, while borderline items route to this cockpit for 1-click human verification."* | • 3-Signal Hybrid Match Engine<br>• Google Gemini 2.5 Flash<br>• Tiered Confidence Governance |
| **0:25 – 0:42** | **1.** Navigate to **Gantt & Schedule** (`/planner/schedule`).<br>**2.** Zoom into the interactive baseline vs. actual timeline.<br>**3.** Click on a delayed activity showing an **Out-of-Sequence Predecessor Violation** badge.<br>**4.** Show the **Historical Duration Risk Benchmark** panel. | *"In the Schedule view, verified field actuals instantly update baseline Gantt timelines. Our analytics engine automatically flags sequence violations if downstream work starts before predecessor sign-off. It benchmarks velocity against 36 historical completed project benchmarks to project duration risks before delays snowball."* | • Interactive Baseline vs Actual Gantt<br>• Predecessor Sequence Enforcement<br>• Historical Velocity Forecasting |
| **0:42 – 1:00** | **1.** Click **Supervisor Workload** (`/planner/workload`).<br>**2.** Show workload distribution and automated task assignments.<br>**3.** Click **Site Complaints & HSE** (`/planner/complaints`) showing auto-tagged safety alerts. | *"Planners also gain live visibility into supervisor workload distribution and automated HSE hazard detection from site notes. Safety keywords like 'PPE missing' or 'near miss' are auto-flagged into compliance tickets without disrupting daily reporting."* | • Dynamic Activity Balancing<br>• Automated HSE Safety Tagging |

---

### Part 2: Field Supervisor Mobile PWA (1:00 – 2:00)

| Time | On-Screen Action (Video Visuals) | Spoken Voiceover (Exact Audio Script) | Key Engineering Concepts |
| :--- | :--- | :--- | :--- |
| **1:00 – 1:12** | **1.** Switch screen to a mobile frame (390×844 px) or phone screen at `/supervisor`.<br>**2.** Point out the gold **"Install App / ऐप इंस्टॉल"** button in the top bar and the bottom PWA card.<br>**3.** Click it to showcase the tabbed **iPhone (iOS Safari) & Android** installation guide. | *"Now switching to the field reality: site supervisors access the lightweight ScheduleSync PWA on their mobile devices. When opened in any browser on iPhone or Android, an instant install option is available, allowing it to be added to the mobile home screen as a standalone, native app."* | • Dual iPhone & Android PWA Install<br>• Standalone Detection (Clean Mode) |
| **1:12 – 1:25** | **1.** View the **Supervisor Home** (`/supervisor`).<br>**2.** Point to the **Delayed Activities Pop-Up Alert**.<br>**3.** Tap the **Language Switcher (हिन्दी / English)** to show instantaneous bilingual UI translation. | *"On the supervisor home screen, daily assigned activities are organized by discipline. If critical activities are delayed, an interactive pop-up immediately alerts the supervisor. With a single tap, the entire UI switches between English and Hindi for maximum usability on remote refinery sites."* | • Real-Time Delayed Tasks Alert<br>• Complete Hindi & English Localization |
| **1:25 – 1:42** | **1.** Tap the **Log Progress (+)** button in the bottom navigation bar (`/supervisor/log`).<br>**2.** Tap the red **Microphone** button to speak (or click a quick dictation chip: e.g. *Line 24 Piping*).<br>**3.** Watch live text transcribing and notice the audio file player badge (*'voic rakih'*). | *"Logging field progress takes under 45 seconds. Supervisors can simply speak naturally in English or Hindi. Our pipeline captures the voice note using Web Speech and Faster-Whisper, generating structured progress descriptions while safely preserving the original audio file for audit verification."* | • Speech-to-Text Voice Dictation<br>• Multilingual Speech Recognition<br>• Audio Retention Audit Compliance |
| **1:42 – 2:00** | **1.** Open DevTools and switch Network to **Offline** (or toggle airplane mode).<br>**2.** Tap **Submit Report**.<br>**3.** Observe the amber badge: **"Queued — will send when online"**.<br>**4.** Toggle Network back to **Online** — watch the background auto-sync toast confirm success! | *"Crucially, ScheduleSync is 100% offline-first. In network dead zones, reports and audio attachments store securely in IndexedDB. As soon as signal returns, our Background Sync manager automatically pushes all queued logs to the master schedule. ScheduleSync brings complete certainty to capital projects."* | • IndexedDB Offline Storage Queue<br>• Background Sync Manager<br>• Zero-Data-Loss Reliability |

---

## 🎥 Recording & Presentation Best Practices

1. **Resolution & Aspect Ratio**:
   - **Part 1 (Desktop)**: 1920×1080 (Full HD, 16:9), zoomed in to ~110% in Chrome for crystal-clear readability of text and Gantt charts.
   - **Part 2 (Mobile)**: Use Chrome DevTools Device Mode (iPhone 14 Pro / 393×852) or record on an actual smartphone screencast.
2. **Audio Delivery**:
   - Total spoken word count: **~285 words**.
   - Speaking rate: **140–145 words per minute** (natural, confident, professional tempo).
3. **Smooth Transitions**:
   - At 1:00, use a crisp swipe or split-screen zoom transition from the desktop planner view to the mobile smartphone mockup.
