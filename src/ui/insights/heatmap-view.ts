import type { InsightsViewDeps } from '../insights-view.js';
import type { MoodColor } from '@src/models/index.js';
import { buildDayAggregates } from '../insights-aggregator.js';
import type { DayAggregate } from '../insights-aggregator.js';

/** Map mood color to hex fill — vibrant gradient-ready colors. */
export function moodToHexColor(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return '#E53935';
    case 'amber': return '#FFB300';
    case 'green': return '#43A047';
    default: return '#E0E0E0';
  }
}

/** Get a CSS gradient for a mood cell to add depth. */
function moodToGradient(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)';
    case 'amber': return 'linear-gradient(135deg, #FFCA28 0%, #F57F17 100%)';
    case 'green': return 'linear-gradient(135deg, #66BB6A 0%, #2E7D32 100%)';
    default: return 'linear-gradient(135deg, #EEEEEE 0%, #BDBDBD 100%)';
  }
}

/** Compute cell opacity based on event count relative to month max. */
export function computeCellOpacity(eventCount: number, maxEventCount: number): number {
  if (maxEventCount <= 0) return 0.4;
  return Math.min(1.0, 0.4 + 0.6 * (eventCount / maxEventCount));
}

/** Get the number of calendar weeks that contain at least one day of the given month. */
export function getWeekColumnsForMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();
  return Math.ceil((firstDow + daysInMonth) / 7);
}

/**
 * Render the Heat Map Calendar sub-view.
 */
export function renderHeatmapView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  let displayDate = new Date(); // current month

  renderMonth(container, deps, profileId, displayDate);
}

function renderMonth(
  container: HTMLElement,
  deps: InsightsViewDeps,
  profileId: string,
  displayDate: Date,
): void {
  container.innerHTML = '';

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  // Month navigation header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◀';
  prevBtn.style.cssText = 'border:none;background:none;font-size:0.8rem;cursor:pointer;color:var(--accent);padding:4px 8px;';
  prevBtn.addEventListener('click', () => {
    const prev = new Date(year, month - 1, 1);
    renderMonth(container, deps, profileId, prev);
  });

  const monthLabel = document.createElement('span');
  monthLabel.textContent = displayDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  monthLabel.style.cssText = 'font-size:0.75rem;font-weight:600;color:var(--text);';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '▶';
  nextBtn.style.cssText = 'border:none;background:none;font-size:0.8rem;cursor:pointer;color:var(--accent);padding:4px 8px;';
  nextBtn.addEventListener('click', () => {
    const next = new Date(year, month + 1, 1);
    renderMonth(container, deps, profileId, next);
  });

  header.appendChild(prevBtn);
  header.appendChild(monthLabel);
  header.appendChild(nextBtn);
  container.appendChild(header);

  // Day-of-week labels
  const dowLabels = document.createElement('div');
  dowLabels.style.cssText = 'display:grid;grid-template-columns:repeat(7, 1fr);gap:2px;margin-bottom:4px;';
  for (const day of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) {
    const lbl = document.createElement('span');
    lbl.textContent = day;
    lbl.style.cssText = 'text-align:center;font-size:0.55rem;color:var(--text-muted);font-weight:600;';
    dowLabels.appendChild(lbl);
  }
  container.appendChild(dowLabels);

  // Get aggregates for the month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  const aggregates = buildDayAggregates(deps.dataStore, profileId, startOfMonth, endOfMonth);

  // Build a map for quick lookup
  const aggMap = new Map<string, DayAggregate>();
  for (const agg of aggregates) {
    aggMap.set(agg.dateKey, agg);
  }

  // Find max event count for opacity scaling
  const maxEventCount = Math.max(1, ...aggregates.map((a) => a.totalEventCount));

  // Build grid
  const firstDow = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const totalCells = getWeekColumnsForMonth(year, month) * 7;

  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(7, 1fr);gap:2px;`;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDow + 1;
    const cell = document.createElement('div');
    cell.style.cssText = 'aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.55rem;position:relative;cursor:pointer;min-height:28px;';

    if (dayNum < 1 || dayNum > daysInMonth) {
      // Empty cell (outside month)
      cell.style.background = 'transparent';
      cell.style.cursor = 'default';
    } else {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const agg = aggMap.get(dateKey);
      const mood = agg?.effectiveMood ?? null;
      const eventCount = agg?.totalEventCount ?? 0;
      const opacity = computeCellOpacity(eventCount, maxEventCount);

      cell.style.background = moodToGradient(mood);
      cell.style.opacity = String(opacity);
      cell.textContent = String(dayNum);
      cell.style.color = mood === null ? 'var(--text-muted)' : 'white';
      cell.style.fontWeight = '600';
      cell.style.textShadow = mood !== null ? '0 1px 2px rgba(0,0,0,0.2)' : 'none';

      // Tap to show popover
      cell.addEventListener('click', () => {
        showDayPopover(container, cell, dateKey, agg);
      });
    }

    grid.appendChild(cell);
  }

  container.appendChild(grid);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:10px;padding:8px 0;';
  const legendItems: { color: string; label: string }[] = [
    { color: '#43A047', label: 'Good day' },
    { color: '#FFB300', label: 'Mixed day' },
    { color: '#E53935', label: 'Tough day' },
    { color: '#E0E0E0', label: 'No data' },
  ];
  for (const item of legendItems) {
    const el = document.createElement('span');
    el.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:0.55rem;color:var(--text-dim);';
    el.innerHTML = `<span style="width:10px;height:10px;border-radius:3px;background:${item.color};display:inline-block;"></span>${item.label}`;
    legend.appendChild(el);
  }
  container.appendChild(legend);
}

function showDayPopover(
  container: HTMLElement,
  cell: HTMLElement,
  dateKey: string,
  agg: DayAggregate | undefined,
): void {
  // Remove any existing popover
  const existing = container.querySelector('.heatmap-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.className = 'heatmap-popover';
  popover.style.cssText = 'position:absolute;z-index:20;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:8px 10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-size:0.65rem;color:var(--text);max-width:180px;';

  let content = `<div style="font-weight:600;margin-bottom:4px;">${dateKey}</div>`;
  if (!agg || agg.totalEventCount === 0) {
    content += '<div style="color:var(--text-dim);">No events logged</div>';
  } else {
    const entries = Object.entries(agg.eventCountsByType).filter(([, c]) => c > 0);
    for (const [type, count] of entries) {
      content += `<div>${type.replace(/_/g, ' ')}: ${count}</div>`;
    }
  }
  popover.innerHTML = content;

  // Position near the cell
  const rect = cell.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  popover.style.left = `${rect.left - containerRect.left}px`;
  popover.style.top = `${rect.bottom - containerRect.top + 4}px`;

  container.style.position = 'relative';
  container.appendChild(popover);

  // Auto-dismiss
  setTimeout(() => popover.remove(), 3000);
  document.addEventListener('click', () => popover.remove(), { once: true });
}
