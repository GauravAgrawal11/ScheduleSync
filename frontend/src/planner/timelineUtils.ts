/**
 * ScheduleSync Real-Time Timeline & Date Utilities
 * Computes exact, data-driven calendar intervals, column layouts,
 * and status Data Date indicators from live project data without fuzzy mocks.
 */

export interface TimelineColumn {
  id: string;          // e.g. "W05", "W06"
  label: string;       // e.g. "W05 · 26 Jan"
  dateRange: string;   // e.g. "26 Jan – 01 Feb 2026"
  startDate: Date;     // Monday 00:00:00 local
  endDate: Date;       // Sunday 23:59:59 local
  isDataDate: boolean; // true if Project Data Date falls into this interval
}

/**
 * Safely parse YYYY-MM-DD or ISO strings into local Date objects without UTC timezone day shifts
 */
export function parseLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  const clean = String(dateInput).split('T')[0].trim();
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date to exact British/Indian standard (e.g., "26 Jan 2026")
 */
export function formatExactDate(dateInput: string | Date | null | undefined): string {
  const d = parseLocalDate(dateInput);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date to short day/month (e.g., "26 Jan")
 */
export function formatShortDate(dateInput: string | Date | null | undefined): string {
  const d = parseLocalDate(dateInput);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Compute ISO 8601 week number
 */
export function getIsoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export interface ActivityDateInput {
  actualStart?: string | null;
  forecastFinish?: string | null;
  planned_start?: string | null;
  planned_finish?: string | null;
  actual_start?: string | null;
  actual_finish?: string | null;
}

/**
 * Generates dynamic, strictly data-driven weekly timeline columns
 * encompassing all activities in the project.
 */
export function buildTimelineColumns(
  activities: ActivityDateInput[],
  projectDataDateStr?: string | null
): {
  columns: TimelineColumn[];
  dataDate: Date;
  dataDateColIndex: number;
  dataDateRatio: number;
} {
  const timestamps: number[] = [];

  activities.forEach((act) => {
    const dates = [
      act.actualStart,
      act.forecastFinish,
      act.planned_start,
      act.planned_finish,
      act.actual_start,
      act.actual_finish,
    ];
    dates.forEach((dStr) => {
      const parsed = parseLocalDate(dStr);
      if (parsed) timestamps.push(parsed.getTime());
    });
  });

  // If no dates found, fallback to standard project window (Jan - Mar 2026)
  const defaultEarliest = new Date(2026, 0, 26).getTime();
  const defaultLatest = new Date(2026, 2, 8).getTime();

  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : defaultEarliest;
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : defaultLatest;

  // Align minTs to Monday
  const minDate = new Date(minTs);
  const dayOfWeek = minDate.getDay(); // 0 is Sun, 1 is Mon
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  minDate.setDate(minDate.getDate() + diffToMonday);
  minDate.setHours(0, 0, 0, 0);

  // Align maxTs to Sunday
  const maxDate = new Date(maxTs);
  const finishDay = maxDate.getDay();
  const diffToSunday = finishDay === 0 ? 0 : 7 - finishDay;
  maxDate.setDate(maxDate.getDate() + diffToSunday);
  maxDate.setHours(23, 59, 59, 999);

  // Resolve Data Date (Project status date)
  let dataDate: Date;
  if (projectDataDateStr) {
    const parsed = parseLocalDate(projectDataDateStr);
    dataDate = parsed || new Date(2026, 1, 9);
  } else {
    // Default to W07 status date: 9 Feb 2026
    dataDate = new Date(2026, 1, 9);
  }

  // Generate columns week by week
  const columns: TimelineColumn[] = [];
  const cursor = new Date(minDate);

  while (cursor.getTime() <= maxDate.getTime() || columns.length < 6) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekNum = getIsoWeekNumber(weekStart);
    const weekPad = String(weekNum).padStart(2, '0');
    const startStr = formatShortDate(weekStart);
    const endStr = formatShortDate(weekEnd);
    const yearStr = weekStart.getFullYear();

    const isDataDate =
      dataDate.getTime() >= weekStart.getTime() &&
      dataDate.getTime() <= weekEnd.getTime();

    columns.push({
      id: `W${weekPad}`,
      label: `W${weekPad} · ${startStr}`,
      dateRange: `${startStr} – ${endStr} ${yearStr}`,
      startDate: weekStart,
      endDate: weekEnd,
      isDataDate,
    });

    // Advance 7 days
    cursor.setDate(cursor.getDate() + 7);
  }

  // Find data date column and relative ratio within the column
  let dataDateColIndex = columns.findIndex((c) => c.isDataDate);
  let dataDateRatio = 0.5;

  if (dataDateColIndex === -1) {
    if (dataDate.getTime() < columns[0].startDate.getTime()) {
      dataDateColIndex = 0;
      dataDateRatio = 0;
    } else {
      dataDateColIndex = columns.length - 1;
      dataDateRatio = 1.0;
    }
  } else {
    const targetCol = columns[dataDateColIndex];
    const totalSpan = targetCol.endDate.getTime() - targetCol.startDate.getTime();
    const elapsed = dataDate.getTime() - targetCol.startDate.getTime();
    dataDateRatio = Math.max(0, Math.min(1, elapsed / (totalSpan || 1)));
  }

  return {
    columns,
    dataDate,
    dataDateColIndex,
    dataDateRatio,
  };
}

/**
 * Finds the exact matching column index for a given activity date
 */
export function getActivityColumnIndex(
  actDateInput: string | Date | null | undefined,
  columns: TimelineColumn[]
): number {
  const d = parseLocalDate(actDateInput);
  if (!d || columns.length === 0) return 0;

  const t = d.getTime();
  const foundIdx = columns.findIndex(
    (c) => t >= c.startDate.getTime() && t <= c.endDate.getTime()
  );

  if (foundIdx !== -1) return foundIdx;
  if (t < columns[0].startDate.getTime()) return 0;
  return columns.length - 1;
}

/**
 * Calculates exact horizontal pixel offset for the red Data Date line
 */
export function calculateDataDateX(
  columns: TimelineColumn[],
  dataDate: Date,
  columnWidth: number,
  gutterWidth: number = 0
): number {
  if (columns.length === 0) return gutterWidth;

  const colIdx = columns.findIndex(
    (c) =>
      dataDate.getTime() >= c.startDate.getTime() &&
      dataDate.getTime() <= c.endDate.getTime()
  );

  if (colIdx !== -1) {
    const col = columns[colIdx];
    const span = col.endDate.getTime() - col.startDate.getTime();
    const ratio = Math.max(0, Math.min(1, (dataDate.getTime() - col.startDate.getTime()) / span));
    return gutterWidth + colIdx * columnWidth + Math.round(ratio * columnWidth);
  }

  if (dataDate.getTime() < columns[0].startDate.getTime()) {
    return gutterWidth;
  }

  return gutterWidth + columns.length * columnWidth;
}
