import type { InsightsViewDeps } from '../insights-view.js';
import type { MoodColor } from '@src/models/index.js';
import { buildDayAggregates, groupConsecutiveMoods } from '../insights-aggregator.js';
import type { DayAggregate } from '../insights-aggregator.js';

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
    case 'red': return 'rgba(235,87,87,0.12)';
    case 'amber': return 'rgba(242,201,76,0.12)';
    case 'green': return 'rgba(127,191,159,0.12)';
    default: return 'transparent';
  }
}

/**
 * Render the Weather sub-view: a horizontally scrollable strip of 60 day-cells
 * with weather icons mapped from DayMood red/amber/green values.
 */
export function renderWeatherView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_TO_SHOW + 1);

  const aggregates = buildDayAggregates(deps.dataStore, profileId, startDate, endDate);
  const runs = groupConsecutiveMoods(aggregates);

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Mood Weather';
  title.style.cssText = 'margin:0 0 8px;font-size:0.78rem;color:var(--text);';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Last 60 days — stormy to sunny';
  subtitle.style.cssText = 'margin:0 0 10px;font-size:0.65rem;color:var(--text-dim);';
  container.appendChild(subtitle);

  // Scrollable strip container
  const strip = document.createElement('div');
  strip.className = 'weather-strip';
  strip.style.cssText = 'display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding:8px 0;scrollbar-width:none;position:relative;';

  // Tooltip element (reused)
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'display:none;position:absolute;top:-40px;left:0;padding:4px 8px;background:var(--text);color:white;border-radius:6px;font-size:0.6rem;white-space:nowrap;z-index:10;pointer-events:none;transition:left 0.1s;';
  strip.appendChild(tooltip);

  // Render day cells grouped by mood runs for shared background
  let cellIndex = 0;
  for (const run of runs) {
    for (let i = 0; i < run.days.length; i++) {
      const day = run.days[i];
      const cell = document.createElement('div');
      cell.className = 'weather-cell';
      cell.dataset.index = String(cellIndex);

      // Border radius: round left edge of first in run, right edge of last
      let borderRadius = '0';
      if (run.days.length === 1) borderRadius = '8px';
      else if (i === 0) borderRadius = '8px 0 0 8px';
      else if (i === run.days.length - 1) borderRadius = '0 8px 8px 0';

      cell.style.cssText = `
        flex-shrink:0;width:40px;display:flex;flex-direction:column;align-items:center;
        justify-content:center;padding:6px 0;cursor:pointer;scroll-snap-align:start;
        background:${moodToTint(run.mood)};border-radius:${borderRadius};
        transition:transform 0.1s;
      `;

      const icon = document.createElement('span');
      icon.textContent = moodToWeatherIcon(day.effectiveMood);
      icon.style.cssText = 'font-size:1.1rem;line-height:1;';

      const dateLabel = document.createElement('span');
      const dayNum = parseInt(day.dateKey.split('-')[2], 10);
      dateLabel.textContent = String(dayNum);
      dateLabel.style.cssText = 'font-size:0.55rem;color:var(--text-muted);margin-top:2px;';

      cell.appendChild(icon);
      cell.appendChild(dateLabel);

      // Tap handler for tooltip
      cell.addEventListener('click', () => {
        const moodLabel = day.effectiveMood ?? 'none';
        tooltip.textContent = `${day.dateKey} · ${moodLabel} · ${day.totalEventCount} event${day.totalEventCount !== 1 ? 's' : ''}`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${cell.offsetLeft + 20 - tooltip.offsetWidth / 2}px`;
        setTimeout(() => { tooltip.style.display = 'none'; }, 2500);
      });

      strip.appendChild(cell);
      cellIndex++;
    }
  }

  container.appendChild(strip);

  // Auto-scroll to the right (most recent days)
  requestAnimationFrame(() => {
    strip.scrollLeft = strip.scrollWidth - strip.clientWidth;
  });

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px;padding:6px 0;';
  const legendItems: { icon: string; label: string }[] = [
    { icon: '☀️', label: 'Good day' },
    { icon: '⛅', label: 'Mixed day' },
    { icon: '⛈️', label: 'Tough day' },
    { icon: '·', label: 'No data' },
  ];
  for (const item of legendItems) {
    const el = document.createElement('span');
    el.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:0.58rem;color:var(--text-dim);';
    el.innerHTML = `<span style="font-size:0.8rem;">${item.icon}</span>${item.label}`;
    legend.appendChild(el);
  }
  container.appendChild(legend);
}
