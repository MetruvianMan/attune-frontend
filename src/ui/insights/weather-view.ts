import type { InsightsViewDeps } from '../insights-view.js';
import type { MoodColor } from '@src/models/index.js';
import { buildDayAggregates } from '../insights-aggregator.js';

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
 * Render the Weather sub-view as a monthly calendar with navigation.
 * Shows one month at a time with < > arrows to navigate between months.
 */
export function renderWeatherView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  // Track current viewing month
  let currentMonth = new Date();
  
  function renderMonth(): void {
    container.innerHTML = '';

    const viewingMonth = currentMonth.getMonth();
    const viewingYear = currentMonth.getFullYear();
    
    // Start from the 1st of the viewing month
    const startDate = new Date(viewingYear, viewingMonth, 1);
    // End at the last day of the viewing month
    const endDate = new Date(viewingYear, viewingMonth + 1, 0, 23, 59, 59, 999);

    const aggregates = buildDayAggregates(deps.dataStore, profileId, startDate, endDate);
    const aggregateMap = new Map(aggregates.map(a => [a.dateKey, a]));

    // Calculate analytics
    const analytics = {
      good: aggregates.filter(d => d.effectiveMood === 'green').length,
      mixed: aggregates.filter(d => d.effectiveMood === 'amber').length,
      difficult: aggregates.filter(d => d.effectiveMood === 'red').length,
      total: aggregates.filter(d => d.effectiveMood !== null).length,
    };

    // Month navigation header
    const monthHeader = document.createElement('div');
    monthHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    const prevButton = document.createElement('button');
    prevButton.textContent = '‹';
    prevButton.style.cssText = 'width:36px;height:36px;border-radius:18px;background:rgba(74,144,226,0.1);color:var(--accent);font-size:28px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.15s;';
    prevButton.addEventListener('mouseenter', () => { prevButton.style.background = 'rgba(74,144,226,0.18)'; });
    prevButton.addEventListener('mouseleave', () => { prevButton.style.background = 'rgba(74,144,226,0.1)'; });
    prevButton.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      renderMonth();
    });

    const monthTitleContainer = document.createElement('div');
    monthTitleContainer.style.cssText = 'flex:1;text-align:center;';
    
    const monthTitle = document.createElement('div');
    monthTitle.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthTitle.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);';
    monthTitleContainer.appendChild(monthTitle);

    if (analytics.total > 0) {
      const analyticsLine = document.createElement('div');
      analyticsLine.textContent = `${analytics.good} good day${analytics.good === 1 ? '' : 's'}`;
      analyticsLine.style.cssText = 'font-size:0.66rem;color:var(--text-dim);margin-top:2px;';
      monthTitleContainer.appendChild(analyticsLine);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = '›';
    
    const today = new Date();
    const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
    
    nextButton.style.cssText = `width:36px;height:36px;border-radius:18px;background:${isCurrentMonth ? 'rgba(0,0,0,0.03)' : 'rgba(74,144,226,0.1)'};color:${isCurrentMonth ? 'var(--text-muted)' : 'var(--accent)'};font-size:28px;font-weight:600;border:none;cursor:${isCurrentMonth ? 'not-allowed' : 'pointer'};display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.15s;`;
    
    if (!isCurrentMonth) {
      nextButton.addEventListener('mouseenter', () => { nextButton.style.background = 'rgba(74,144,226,0.18)'; });
      nextButton.addEventListener('mouseleave', () => { nextButton.style.background = 'rgba(74,144,226,0.1)'; });
      nextButton.addEventListener('click', () => {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        if (newMonth <= today) {
          currentMonth = newMonth;
          renderMonth();
        }
      });
    }

    monthHeader.appendChild(prevButton);
    monthHeader.appendChild(monthTitleContainer);
    monthHeader.appendChild(nextButton);
    container.appendChild(monthHeader);

    // Day-of-week header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;';
    for (const dayName of DAY_HEADERS) {
      const hdr = document.createElement('div');
      hdr.textContent = dayName;
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;color:var(--text-muted);padding:2px 0;aspect-ratio:1;';
      headerRow.appendChild(hdr);
    }
    container.appendChild(headerRow);

    // Build weeks from first Monday through end of month
    const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(firstDayOfMonth);
    firstMonday.setDate(firstDayOfMonth.getDate() + mondayOffset);

    const weeks: Array<Array<{ date: Date; dateKey: string } | null>> = [];
    const cursor = new Date(firstMonday);
    const lastDayOfMonth = new Date(viewingYear, viewingMonth + 1, 0);

    while (cursor <= lastDayOfMonth) {
      const week: Array<{ date: Date; dateKey: string } | null> = [];
      for (let d = 0; d < 7; d++) {
        if (cursor < startDate || cursor > endDate) {
          week.push(null); // empty cell for days outside month
        } else {
          const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
          week.push({ date: new Date(cursor), dateKey });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    // Scrollable grid container - increased height for 5+ weeks
    const gridScroll = document.createElement('div');
    gridScroll.style.cssText = 'max-height:380px;overflow-y:auto;scrollbar-width:none;border-radius:10px;';

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
          background:${moodToTint(mood)};border:1px solid rgba(0,0,0,0.05);
          transition:transform 0.1s;
        `;

        const icon = document.createElement('span');
        icon.textContent = moodToWeatherIcon(mood);
        icon.style.cssText = 'font-size:1rem;line-height:1;';

        const dateLabel = document.createElement('span');
        dateLabel.textContent = String(daySlot.date.getDate());
        dateLabel.style.cssText = 'font-size:0.5rem;color:var(--text-muted);margin-top:1px;font-weight:500;';

        cell.appendChild(icon);
        cell.appendChild(dateLabel);

        // Tap for tooltip and navigation
        cell.addEventListener('click', (e) => {
          const moodLabel = mood ?? 'none';
          const eventCount = agg?.totalEventCount ?? 0;
          tooltip.textContent = `${daySlot.dateKey} · ${moodLabel} · ${eventCount} event${eventCount !== 1 ? 's' : ''}`;
          tooltip.style.display = 'block';
          tooltip.style.left = `${(e as MouseEvent).clientX - 40}px`;
          tooltip.style.top = `${(e as MouseEvent).clientY - 36}px`;
          setTimeout(() => { tooltip.style.display = 'none'; }, 2500);
          
          // Navigate to Today tab for this date
          if (deps.onNavigateToDate) {
            deps.onNavigateToDate(daySlot.date);
          }
        });

        weekRow.appendChild(cell);
      }

      gridScroll.appendChild(weekRow);
    }

    container.appendChild(gridScroll);

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

  // Initial render
  renderMonth();
}
