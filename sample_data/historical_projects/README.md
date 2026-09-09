# Historical projects dataset (institutional memory demo)

Two entirely fictional, closed-out projects — not Numaligarh, not any named Oil India
site. Generic enough to look like any brownfield oil & gas EPC job in Assam.

- **HIST-P1 — Kaziranga Tank Farm Expansion** (Jan–Mar 2023, 18 activities)
- **HIST-P2 — Dhemaji Pipeline Corridor Upgrade** (Feb–Apr 2024, 18 activities)

36 activities total across Civil / Piping / Electrical / HSE. 14 of them are
"Erect Line" activities spanning pipe diameters from 6" to 24", each with a real
planned-vs-actual variance and a tagged `delay_reason` (or `none`).

Files:
- `projects.csv` — project-level metadata (id, name, site type, region, dates, status)
- `historical_activities.csv` — every activity, planned vs actual dates/durations, variance, delay reason
- this README

Delay reasons used (deliberately varied, so a "common delay cause" analytics query has
something real to surface): `material delay`, `rework`, `weather`, `manpower shortage`,
`crane breakdown`, `land/ROW access`, `rocky strata`, `utility clash`, `none`.

---

## Worked example — validate your "how long did line erection take" query against this

If your analytics/RAG feature is asked something like *"how long did line erection
typically take, by pipe diameter?"*, it should be computing an average of
`actual_duration_days` across all 14 `Erect Line` rows (both projects combined),
grouped by diameter. The known-correct answer, computed by hand from the CSV above:

| Diameter | Instances | Actual durations (days) | Avg actual (days) | Avg planned (days) | Avg variance (days) |
|---|---|---|---|---|---|
| 6"  | 2 | 2, 3 | 2.5 | 2.0 | +0.5 |
| 8"  | 2 | 2, 4 | 3.0 | 2.0 | +1.0 |
| 10" | 2 | 3, 5 | 4.0 | 3.0 | +1.0 |
| 12" | 2 | 4, 3 | 3.5 | 3.0 | +0.5 |
| 16" | 2 | 4, 6 | 5.0 | 4.0 | +1.0 |
| 20" | 2 | 7, 5 | 6.0 | 5.0 | +1.0 |
| 24" | 2 | 7, 9 | 8.0 | 6.0 | +2.0 |

**The pattern worth surfacing in your demo:** larger-diameter lines don't just take
longer in absolute terms — their average *overrun* also grows (24" lines ran ~33%
over plan on average, vs ~25% for 6" lines). That's a genuinely useful institutional-
memory insight: bigger pipe means proportionally bigger schedule risk, likely because
larger-diameter erection is more exposed to crane availability and access constraints
— both of which show up as delay reasons on the 20"/24" rows in the CSV (`crane
breakdown`, `utility clash`).

Use this table exactly like `answer_key.csv` in the main matching dataset: it's the
ground truth to check your analytics/RAG feature's output against, not something to
show a judge directly as a spreadsheet.

## Other queries this dataset can answer, if you want more demo material

- *"What's the most common cause of delay on trenching/civil work?"* → `rocky strata`
  and `land/ROW access` dominate the HIST-P2 civil rows (pipeline corridor work),
  vs `rework`/`weather` on HIST-P1's tank-farm civil work — a reasonable "different
  site types have different risk profiles" insight.
- *"Which discipline had the most delay days overall?"* → sum `variance_days` grouped
  by `discipline`; Piping will come out highest by volume simply because it has the
  most activities (18 of 36), so if you use this, also show a *per-activity average*
  variance alongside the total to avoid a misleading headline number.
