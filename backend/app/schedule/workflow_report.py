"""
ScheduleSync (SIH26122) - Project Workflow Report PDF Generator
Generates a multi-page executive workflow report using ReportLab Platypus API.
Summarizes schedule activities grouped by discipline and merged chronologically
to present an operational workflow rather than a raw data dump.
"""

import io
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)

from app.models.project import Project
from app.models.activity import Activity


# -----------------------------------------------------------------------------
# Color Palette (Industrial Refinery / ScheduleSync Brand)
# -----------------------------------------------------------------------------
NAVY_PRIMARY = colors.HexColor("#0f233a")
NAVY_SECONDARY = colors.HexColor("#1e3a5f")
TEAL_ACCENT = colors.HexColor("#0d9488")
SLATE_DARK = colors.HexColor("#1e293b")
SLATE_MUTED = colors.HexColor("#64748b")
SLATE_LIGHT = colors.HexColor("#f8fafc")
BORDER_COLOR = colors.HexColor("#cbd5e1")
ZEBRA_ROW = colors.HexColor("#f1f5f9")


def _format_date(d: Optional[date]) -> str:
    """Format date to YYYY-MM-DD or return fallback."""
    if not d:
        return "—"
    return d.strftime("%Y-%m-%d")


def _calculate_duration(start: Optional[date], finish: Optional[date]) -> str:
    """Calculate duration in calendar days (inclusive)."""
    if not start or not finish:
        return "—"
    days = (finish - start).days + 1
    return f"{days} d" if days > 0 else "1 d"


def generate_workflow_pdf(project_id: int, db: Session) -> bytes:
    """
    Generate an executive Project Workflow Report PDF as bytes.
    
    Args:
        project_id: Primary key of the project.
        db: SQLAlchemy session.
        
    Returns:
        bytes: Raw PDF content streamable via HTTP response.
        
    Raises:
        ValueError: If project not found or has 0 activities.
    """
    # 1. Fetch project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with ID {project_id} not found.")

    # 2. Fetch all activities ordered by planned_start (nulls sorted last), then activity_id
    activities: List[Activity] = (
        db.query(Activity)
        .filter(Activity.project_id == project_id)
        .order_by(Activity.planned_start.asc().nulls_last(), Activity.id.asc())
        .all()
    )

    if not activities:
        raise ValueError(f"Project '{project.name}' has no schedule activities. Import a schedule first.")

    # 3. Setup buffer & landscape document
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    # Printable width: 792 - 72 = 720 pt
    TOTAL_WIDTH = 720

    # 4. Typography styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=NAVY_PRIMARY,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=SLATE_MUTED,
    )
    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=NAVY_PRIMARY,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=NAVY_SECONDARY,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=SLATE_DARK,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )
    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=SLATE_DARK,
    )
    cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=NAVY_PRIMARY,
    )
    cell_mono = ParagraphStyle(
        "TableCellMono",
        parent=cell_style,
        fontName="Courier-Bold",
        fontSize=7,
        leading=8.5,
        textColor=NAVY_SECONDARY,
    )
    cell_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
    )

    story = []

    # =========================================================================
    # PAGE 1: OVERVIEW & PROJECT METRICS
    # =========================================================================
    
    # Header Banner
    header_table = Table(
        [
            [
                Paragraph("ScheduleSync — Project Workflow Report", title_style),
                Paragraph(
                    f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}<br/>"
                    f"<b>System:</b> SIH26122 AI Schedule Linker",
                    ParagraphStyle("MetaRight", parent=subtitle_style, alignment=2),
                ),
            ],
            [
                Paragraph(
                    f"Project: <b>{project.name}</b> · Client: <b>{project.client}</b>",
                    subtitle_style,
                ),
                Paragraph("", subtitle_style),
            ],
        ],
        colWidths=[480, 240],
    )
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=TEAL_ACCENT, spaceBefore=2, spaceAfter=14))

    # Compute Date Range across activities
    valid_starts = [a.planned_start for a in activities if a.planned_start]
    valid_finishes = [a.planned_finish for a in activities if a.planned_finish]
    earliest_start = min(valid_starts) if valid_starts else project.start_date
    latest_finish = max(valid_finishes) if valid_finishes else project.end_date
    overall_days = (latest_finish - earliest_start).days + 1 if (earliest_start and latest_finish) else 0

    # Summary KPI Cards
    kpi_data = [
        [
            Paragraph("<b>Total WBS Activities</b>", subtitle_style),
            Paragraph("<b>Planned Date Range</b>", subtitle_style),
            Paragraph("<b>Overall Duration</b>", subtitle_style),
            Paragraph("<b>Contract Scope</b>", subtitle_style),
        ],
        [
            Paragraph(f"<font size=14 color='#0f233a'><b>{len(activities)}</b></font>", body_style),
            Paragraph(
                f"<b>{_format_date(earliest_start)}</b> to <b>{_format_date(latest_finish)}</b>",
                body_style,
            ),
            Paragraph(f"<font size=12 color='#0d9488'><b>{overall_days} days</b></font>", body_style),
            Paragraph(f"{project.name} ({project.client})", body_style),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[140, 220, 140, 220])
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SLATE_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(kpi_table)
    story.append(Spacer(1, 16))

    # Group activities by Discipline
    discipline_groups: Dict[str, List[Activity]] = {}
    for act in activities:
        raw_disc = act.discipline
        if hasattr(raw_disc, "value"):
            disc_key = raw_disc.value.upper()
        elif raw_disc:
            disc_key = str(raw_disc).upper()
        else:
            disc_key = "GENERAL SITE"
        discipline_groups.setdefault(disc_key, []).append(act)

    # Activity count per discipline summary table
    story.append(Paragraph("Schedule Breakdown by Engineering Discipline", h1_style))
    story.append(
        Paragraph(
            "Distribution of work packages and date spans across active project engineering disciplines.",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 8))

    disc_summary_rows = [
        [
            Paragraph("Discipline", cell_header),
            Paragraph("Activities", cell_header),
            Paragraph("% of Total", cell_header),
            Paragraph("Discipline Start", cell_header),
            Paragraph("Discipline Finish", cell_header),
            Paragraph("Span (Days)", cell_header),
            Paragraph("Status Distribution", cell_header),
        ]
    ]

    total_acts = len(activities)
    for disc_name, disc_acts in discipline_groups.items():
        disc_starts = [a.planned_start for a in disc_acts if a.planned_start]
        disc_finishes = [a.planned_finish for a in disc_acts if a.planned_finish]
        d_start = min(disc_starts) if disc_starts else None
        d_finish = max(disc_finishes) if disc_finishes else None
        d_span = (d_finish - d_start).days + 1 if (d_start and d_finish) else 0

        completed_count = sum(1 for a in disc_acts if a.status == "COMPLETED")
        in_prog_count = sum(1 for a in disc_acts if a.status == "IN_PROGRESS")
        planned_count = sum(1 for a in disc_acts if a.status == "PLANNED")
        status_str = f"{completed_count} done · {in_prog_count} active · {planned_count} planned"

        disc_summary_rows.append([
            Paragraph(f"<b>{disc_name}</b>", cell_bold),
            Paragraph(str(len(disc_acts)), cell_style),
            Paragraph(f"{(len(disc_acts) / total_acts) * 100:.1f}%", cell_style),
            Paragraph(_format_date(d_start), cell_style),
            Paragraph(_format_date(d_finish), cell_style),
            Paragraph(f"{d_span} d" if d_span > 0 else "—", cell_style),
            Paragraph(status_str, cell_style),
        ])

    disc_summary_table = Table(
        disc_summary_rows,
        colWidths=[120, 60, 60, 85, 85, 70, 240],
    )
    disc_summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA_ROW]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(disc_summary_table)
    story.append(Spacer(1, 14))

    # Narrative explanation
    overview_text = (
        "<b>Workflow Interpretation:</b> This report presents the baseline construction workflow "
        f"for <b>{project.name}</b>. The execution is partitioned into <b>{len(discipline_groups)} disciplines</b>. "
        "Each following section details the sequential progression of tasks within that discipline, followed by a "
        "comprehensive chronological sequence of all trades to highlight site handovers, interface milestones, and potential trade bottlenecks."
    )
    story.append(Paragraph(overview_text, body_style))

    # Overview ends with PageBreak
    story.append(PageBreak())

    # =========================================================================
    # PER-DISCIPLINE WORKFLOW SECTIONS
    # =========================================================================
    # Column Widths for Discipline Tables: (Total = 720 pt)
    # WBS / Act ID (65), Activity Name (210), Location (85), Start (75), Finish (75), Dur (55), Predecessor (155)
    DISC_COL_WIDTHS = [65, 210, 85, 75, 75, 55, 155]

    for disc_idx, (disc_name, disc_acts) in enumerate(discipline_groups.items(), start=1):
        # Section Header
        story.append(
            Paragraph(
                f"{disc_idx}. {disc_name} Discipline Workflow ({len(disc_acts)} Activities)",
                h1_style,
            )
        )
        story.append(
            Paragraph(
                f"Planned activities for <b>{disc_name}</b> ordered chronologically by scheduled start date. "
                "Dependencies indicate preceding activities that must finish before initiation.",
                subtitle_style,
            )
        )
        story.append(Spacer(1, 8))

        disc_table_data = [
            [
                Paragraph("Activity ID", cell_header),
                Paragraph("Activity Name", cell_header),
                Paragraph("Location", cell_header),
                Paragraph("Planned Start", cell_header),
                Paragraph("Planned Finish", cell_header),
                Paragraph("Duration", cell_header),
                Paragraph("Predecessor Activity", cell_header),
            ]
        ]

        for a in disc_acts:
            duration_str = _calculate_duration(a.planned_start, a.planned_finish)
            
            # Predecessor label with lookup name if available
            pred_text = "— (Root / Milestone)"
            if a.predecessor_activity_id:
                pred_text = f"<font color='#0d9488'><b>{a.predecessor_activity_id}</b></font>"

            disc_table_data.append([
                Paragraph(a.activity_id or a.wbs_code or "—", cell_mono),
                Paragraph(f"<b>{a.activity_name}</b>", cell_style),
                Paragraph(a.location or "—", cell_style),
                Paragraph(_format_date(a.planned_start), cell_style),
                Paragraph(_format_date(a.planned_finish), cell_style),
                Paragraph(duration_str, cell_style),
                Paragraph(pred_text, cell_style),
            ])

        disc_table = Table(disc_table_data, colWidths=DISC_COL_WIDTHS, repeatRows=1)
        disc_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY_SECONDARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA_ROW]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(disc_table)

        # PageBreak between disciplines as required by spec
        story.append(PageBreak())

    # =========================================================================
    # FINAL SECTION: CROSS-DISCIPLINE MASTER EXECUTION SEQUENCE
    # =========================================================================
    # Shows all project activities merged and sorted chronologically
    # Column Widths: Act ID (60), Discipline (75), Activity Name (180), Location (80), Start (75), Finish (75), Dur (55), Predecessor (120) = 720 pt
    CROSS_COL_WIDTHS = [60, 75, 180, 80, 75, 75, 55, 120]

    story.append(Paragraph("Cross-Discipline Master Execution Sequence", h1_style))
    story.append(
        Paragraph(
            "Integrated chronological timeline of all project trades. Displays interleaving of Civil, Piping, "
            "Electrical, and HSE activities over the project lifecycle to monitor critical trade handoffs.",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 8))

    cross_table_data = [
        [
            Paragraph("Activity ID", cell_header),
            Paragraph("Discipline", cell_header),
            Paragraph("Activity Name", cell_header),
            Paragraph("Location", cell_header),
            Paragraph("Planned Start", cell_header),
            Paragraph("Planned Finish", cell_header),
            Paragraph("Duration", cell_header),
            Paragraph("Predecessor", cell_header),
        ]
    ]

    for a in activities:
        raw_disc = a.discipline
        disc_label = raw_disc.value.upper() if hasattr(raw_disc, "value") else (str(raw_disc).upper() if raw_disc else "—")
        duration_str = _calculate_duration(a.planned_start, a.planned_finish)
        
        pred_text = "—"
        if a.predecessor_activity_id:
            pred_text = f"<font color='#0d9488'><b>{a.predecessor_activity_id}</b></font>"

        cross_table_data.append([
            Paragraph(a.activity_id or a.wbs_code or "—", cell_mono),
            Paragraph(f"<b>{disc_label}</b>", cell_style),
            Paragraph(a.activity_name, cell_style),
            Paragraph(a.location or "—", cell_style),
            Paragraph(_format_date(a.planned_start), cell_style),
            Paragraph(_format_date(a.planned_finish), cell_style),
            Paragraph(duration_str, cell_style),
            Paragraph(pred_text, cell_style),
        ])

    cross_table = Table(cross_table_data, colWidths=CROSS_COL_WIDTHS, repeatRows=1)
    cross_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA_ROW]),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
        ])
    )
    story.append(cross_table)

    # 5. Build PDF into buffer
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
