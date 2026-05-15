import type { InsightsViewDeps } from '../insights-view.js';
import type { MoodColor } from '@src/models/index.js';
import { buildDayAggregates } from '../insights-aggregator.js';

const DAYS_TO_SHOW = 60;

/** Map mood color to weather icon. */
export function moodToWeatherIcon(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return '⛈️';
    case 'amber': return '⛅';
    case 'green': return '☀️';
    default: return '·';
  }
}

/** Map mood color to background tint. */
function moodToTint(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return 'rgba(235,87,87,0.15)';
    case 'amber': return 'rgba(242,201,76,0.15)';
    case 'green': return 'rgba(127,191,159,0.15)';
    default: return 'transparent';
  }
}

const DAY_HEADERS = ['M', 'T', 'W', 'Th', 'F', 'S', 'S'];

/**
 * Render the Weather sub-view as a vertical calendar grid.
 * Shows up to 60 days in a M-T-W-Th-F-S-S grid layout,
 * with weeks as rows. Scrolls vertically if more than ~4 weeks visible.
 */
export function renderWeatherView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_TO_SHOW + 1);

  const aggregates = buildDayAggregates(deps.dataStore, profileId, startDate, endDate);

  // Build a map of dateKey → aggregate for quick lookup
  const aggregateMap = new Map(aggregates.map(a => [a.dateKey, a]));

  // Title — with extra top margin to avoid obstruction
  const title = document.createElement('h2');
  title.textContent = 'Mood Weather';
  title.style.cssText = 'margin:14px 0 4px;font-size:0.78rem;color:var(--text);';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = `Last ${DAYS_TO_SHOW} days — stormy to sunny`;
  subtitle.style.cssText = 'margin:0 0 12px;font-size:0.65rem;color:var(--text-dim);';
  container.appendChild(subtitle);

  // Day-of-week header row — inside the same grid layout as week rows for alignment
  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;';
  for (const dayName of DAY_HEADERS) {
    const hdr = document.createElement('div');
    hdr.textContent = dayName;
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;color:var(--text-muted);padding:2px 0;aspect-ratio:1;';
    headerRow.appendChild(hdr);
  }
  container.appendChild(headerRow);

  // Build the calendar grid
  // Find the actual first date that has data (mood logged)
  let dataStartDate = new Date(startDate);
  for (const agg of aggregates) {
    if (agg.effectiveMood !== null) {
      const parts = agg.dateKey.split('-');
      dataStartDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      break;
    }
  }
  // Use the earlier of startDate or dataStartDate (but don't go before startDate)
  const effectiveStart = dataStartDate > startDate ? dataStartDate : startDate;

  // Find the Monday on or before the effective start date
  const firstDay = new Date(effectiveStart);
  const dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  firstDay.setDate(firstDay.getDate() + mondayOffset);

  // Build weeks from firstDay through endDate
  const weeks: Array<Array<{ date: Date; dateKey: string } | null>> = [];
  const cursor = new Date(firstDay);

  while (cursor <= endDate) {
    const week: Array<{ date: Date; dateKey: string } | null> = [];
    for (let d = 0; d < 7; d++) {
      if (cursor > endDate || cursor < startDate) {
        week.push(null); // empty cell (before start or after end)
      } else {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        week.push({ date: new Date(cursor), dateKey });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Scrollable grid container
  const gridScroll = document.createElement('div');
  gridScroll.style.cssText = 'max-height:280px;overflow-y:auto;scrollbar-width:none;border-radius:10px;';

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'display:none;position:fixed;padding:4px 8px;background:var(--text);color:white;border-radius:6px;font-size:0.6rem;white-space:nowrap;z-index:100;pointer-events:none;';
  container.appendChild(tooltip);

  // Render each week as a grid row
  for (const week of weeks) {
    const weekRow = document.createElement('div');
    weekRow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:2px;';

    for (const daySlot of week) {
      const cell = document.createElement('div');

      if (!daySlot) {
        // Empty cell
        cell.style.cssText = 'aspect-ratio:1;border-radius:8px;';
        weekRow.appendChild(cell);
        continue;
      }

      const agg = aggregateMap.get(daySlot.dateKey);
      const mood = agg?.effectiveMood ?? null;

      cell.style.cssText = `
        aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;cursor:pointer;
        background:${moodToTint(mood)};transition:transform 0.1s;
      `;

      const icon = document.createElement('span');
      icon.textContent = moodToWeatherIcon(mood);
      icon.style.cssText = 'font-size:1rem;line-height:1;';

      const dateLabel = document.createElement('span');
      dateLabel.textContent = String(daySlot.date.getDate());
      dateLabel.style.cssText = 'font-size:0.5rem;color:var(--text-muted);margin-top:1px;';

      cell.appendChild(icon);
      cell.appendChild(dateLabel);

      // Tap for tooltip
      cell.addEventListener('click', (e) => {
        const moodLabel = mood ?? 'none';
        const eventCount = agg?.totalEventCount ?? 0;
        tooltip.textContent = `${daySlot.dateKey} · ${moodLabel} · ${eventCount} event${eventCount !== 1 ? 's' : ''}`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${(e as MouseEvent).clientX - 40}px`;
        tooltip.style.top = `${(e as MouseEvent).clientY - 36}px`;
        setTimeout(() => { tooltip.style.display = 'none'; }, 2500);
      });

      weekRow.appendChild(cell);
    }

    gridScroll.appendChild(weekRow);
  }

  container.appendChild(gridScroll);

  // Auto-scroll to bottom (most recent weeks)
  requestAnimationFrame(() => {
    gridScroll.scrollTop = gridScroll.scrollHeight;
  });

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:10px;padding:6px 0;';
  const legendItems: { icon: string; label: string }[] = [
    { icon: '☀️', label: 'Good day' },
    { icon: '⛅', label: 'Mixed day' },
    { icon: '⛈️', label: 'Tough day' },
    { icon: '·', label: 'No data' },
  ];
  for (const item of legendItems) {
    const el = document.createElement('span');
    el.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:0.68rem;color:var(--text-dim);';
    el.innerHTML = `<span style="font-size:1rem;">${item.icon}</span>${item.label}`;
    legend.appendChild(el);
  }
  container.appendChild(legend);
}
