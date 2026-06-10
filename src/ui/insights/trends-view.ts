import type { InsightsViewDeps } from '../insights-view.js';
import type { EventType } from '@src/models/index.js';
import { buildDayAggregates, computeRollingMoodAverage, computeRollingEventCount } from '../insights-aggregator.js';
import type { RollingDataPoint } from '../insights-aggregator.js';

const STORAGE_KEY = 'attune-insights-selected-types';
const MAX_SELECTED = 3;
const WINDOW_SIZE = 7;
const DAYS_RANGE = 30;

/** Color palette for event type overlay lines. */
const OVERLAY_COLORS = ['#9b59b6', '#e67e22', '#1abc9c'];

/** Map mood average value to a smooth RGB color (red→amber→green gradient). */
export function moodValueToColor(value: number): string {
  // Clamp to [1, 3]
  const v = Math.max(1, Math.min(3, value));
  // Normalize to [0, 1] where 0=stormy(red), 1=calm(green)
  const t = (v - 1) / 2;

  // Interpolate: red(235,87,87) → amber(242,201,76) → green(127,191,159)
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    // red → amber (t: 0→0.5)
    const s = t * 2; // 0→1
    r = 235 + (242 - 235) * s;
    g = 87 + (201 - 87) * s;
    b = 87 + (76 - 87) * s;
  } else {
    // amber → green (t: 0.5→1)
    const s = (t - 0.5) * 2; // 0→1
    r = 242 + (127 - 242) * s;
    g = 201 + (191 - 201) * s;
    b = 76 + (159 - 76) * s;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Find the nearest data point to a given x-coordinate. */
export function findNearestPoint(
  points: RollingDataPoint[],
  tapX: number,
  chartWidth: number,
): RollingDataPoint | null {
  if (points.length === 0) return null;
  const step = chartWidth / (points.length - 1 || 1);
  let nearest = points[0];
  let minDist = Math.abs(tapX - 0);
  for (let i = 1; i < points.length; i++) {
    const px = i * step;
    const dist = Math.abs(tapX - px);
    if (dist < minDist) {
      minDist = dist;
      nearest = points[i];
    }
  }
  return nearest;
}

/** Get/set selected event types from sessionStorage. */
export function getSelectedTypes(): EventType[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_SELECTED);
    return [];
  } catch { return []; }
}

export function setSelectedTypes(types: EventType[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(types.slice(0, MAX_SELECTED)));
}

/** Toggle an event type in the selection. Returns updated array or null if max reached. */
export function toggleEventType(current: EventType[], type: EventType): { types: EventType[]; blocked: boolean } {
  const idx = current.indexOf(type);
  if (idx >= 0) {
    return { types: [...current.slice(0, idx), ...current.slice(idx + 1)], blocked: false };
  }
  if (current.length >= MAX_SELECTED) {
    return { types: current, blocked: true };
  }
  return { types: [...current, type], blocked: false };
}

// Event type categories for the selector
const BEHAVIORAL_TYPES: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior', 'aggression', 'overwhelm', 'refusal', 'bad_language'];
const WELLBEING_TYPES: EventType[] = ['mood', 'sleep', 'good_sleep', 'poor_sleep', 'diet', 'screen_time', 'physical_wellness', 'medication'];
const ACTIVITY_TYPES: EventType[] = ['playdate', 'watched_tv', 'sick', 'family_adventure', 'played_outside', 'didnt_eat_dinner', 'wet_bed', 'great_day', 'good_dinner', 'drew_comics', 'stayed_home', 'fast_food', 'sugar', 'poor_transitions', 'chores', 'focus', 'reading', 'kindness', 'sibling_harmony', 'helpful', 'video_games', 'toilet_issue', 'dad_bonding', 'mom_bonding', 'injury', 'sneaky', 'messy', 'travel'];

const TYPE_EMOJIS: Record<string, string> = {
  meltdown: '🌊', shutdown: '🔇', conflict: '⚡', school_incident: '🏫',
  positive_behavior: '🌟', aggression: '😡', overwhelm: '😢',
  mood: '😊', sleep: '😴', good_sleep: '😴', poor_sleep: '😵',
  diet: '🍎', screen_time: '📱', physical_wellness: '🤒', medication: '💊',
  playdate: '👫', watched_tv: '📺', sick: '🤒', family_adventure: '🏕️',
  played_outside: '🌳', didnt_eat_dinner: '🍽️', wet_bed: '🛏️', great_day: '🌟',
  good_dinner: '😋', drew_comics: '🦸', stayed_home: '🏠', fast_food: '🍟',
  aggression: '😠', angry: '😡',
  good_breakfast: '🍳', tired: '🥱', sports: '🏀', party: '🥳', bounceback: '🐦‍🔥',
  sugar: '🍬', poor_transitions: '🎢', chores: '🧹', focus: '🔎',
  reading: '📚', kindness: '🫶',
  refusal: '🙅', sibling_harmony: '🫂', bad_language: '🤬',
  injury: '🤕', sneaky: '🥷', messy: '🫗', helpful: '🤝🏻', video_games: '🎮', toilet_issue: '🚽',
  dad_bonding: '👨🏻', mom_bonding: '👩🏼', travel: '✈️',
};

/**
 * Render the Trends sub-view with Event Type Selector and canvas sparkline.
 */
export function renderTrendsView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  // Get data — determine date range based on actual data
  const endDate = new Date();

  // Find the earliest event to determine chart start
  const allProfileEvents = deps.dataStore.getEvents({ childProfileId: profileId });
  let earliestEvent: Date | null = null;
  for (const ev of allProfileEvents) {
    if (!earliestEvent || ev.timestamp < earliestEvent) {
      earliestEvent = ev.timestamp;
    }
  }

  // Calculate days of data
  const daysOfData = earliestEvent
    ? Math.ceil((endDate.getTime() - earliestEvent.getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0;

  // Use minimum 14 days for x-axis, max 30 days, but never go before first event
  const chartDays = Math.max(14, Math.min(30, daysOfData));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - chartDays + 1);

  // Don't start before the first event
  if (earliestEvent && startDate < earliestEvent) {
    startDate.setTime(earliestEvent.getTime());
    startDate.setHours(0, 0, 0, 0);
  }

  const aggregates = buildDayAggregates(deps.dataStore, profileId, startDate, endDate);

  // Check minimum data threshold
  const daysWithMood = aggregates.filter((a) => a.moodScore !== null).length;
  if (daysWithMood < WINDOW_SIZE) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-dim);font-size:0.75rem;line-height:1.5;';
    msg.innerHTML = `<span style="font-size:1.4rem;">📊</span><br><span style="font-weight:600;color:var(--text);">7+ days of mood data needed for trends</span><br>Keep logging daily moods to unlock trend visualizations.`;
    container.appendChild(msg);
    return;
  }

  // Compute mood rolling average
  const moodLine = computeRollingMoodAverage(aggregates, WINDOW_SIZE);

  // Event Type Selector
  let selectedTypes = getSelectedTypes();
  const selectorCard = document.createElement('div');
  selectorCard.style.cssText = 'margin-bottom:10px;';

  const selectorLabel = document.createElement('div');
  selectorLabel.textContent = 'Overlay event types (max 3):';
  selectorLabel.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;';
  selectorCard.appendChild(selectorLabel);

  const warningMsg = document.createElement('div');
  warningMsg.style.cssText = 'font-size:0.6rem;color:var(--warm);margin-top:4px;display:none;';
  warningMsg.textContent = 'Max 3 overlays — deselect one first';

  function renderChips(): void {
    const existing = selectorCard.querySelector('.chip-grid');
    if (existing) existing.remove();

    const chipGrid = document.createElement('div');
    chipGrid.className = 'chip-grid';
    chipGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;max-height:100px;overflow-y:auto;';

    const allCategories: { label: string; types: EventType[] }[] = [
      { label: 'Behavioral', types: BEHAVIORAL_TYPES },
      { label: 'Well-being', types: WELLBEING_TYPES },
      { label: 'Activity', types: ACTIVITY_TYPES },
    ];

    for (const cat of allCategories) {
      for (const type of cat.types) {
        const chip = document.createElement('button');
        const isSelected = selectedTypes.includes(type);
        chip.textContent = `${TYPE_EMOJIS[type] ?? '📝'} ${type.replace(/_/g, ' ')}`;
        chip.style.cssText = `padding:3px 8px;border-radius:12px;font-size:0.58rem;cursor:pointer;border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'};background:${isSelected ? 'var(--accent)' : 'var(--card)'};color:${isSelected ? 'white' : 'var(--text)'};transition:all 0.12s;`;
        chip.addEventListener('click', () => {
          const result = toggleEventType(selectedTypes, type);
          if (result.blocked) {
            warningMsg.style.display = 'block';
            setTimeout(() => { warningMsg.style.display = 'none'; }, 2000);
          } else {
            selectedTypes = result.types;
            setSelectedTypes(selectedTypes);
            renderChips();
            renderChart();
          }
        });
        chipGrid.appendChild(chip);
      }
    }

    selectorCard.appendChild(chipGrid);
  }

  renderChips();
  selectorCard.appendChild(warningMsg);
  container.appendChild(selectorCard);

  // Chart title
  const chartTitle = document.createElement('div');
  chartTitle.style.cssText = 'font-size:0.72rem;font-weight:600;color:var(--text);margin-bottom:6px;';
  chartTitle.textContent = '7-Day Rolling Average — Mood & Event Frequency';
  container.appendChild(chartTitle);

  // Chart container
  const chartContainer = document.createElement('div');
  chartContainer.style.cssText = 'position:relative;';
  container.appendChild(chartContainer);

  function renderChart(): void {
    chartContainer.innerHTML = '';
    renderSparklineCanvas(chartContainer, moodLine, selectedTypes, aggregates);
  }

  renderChart();
}

function renderSparklineCanvas(
  chartContainer: HTMLElement,
  moodLine: RollingDataPoint[],
  selectedTypes: EventType[],
  aggregates: import('../insights-aggregator.js').DayAggregate[],
): void {
  const width = 339; // phone-frame width minus padding
  const height = 220;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'width:100%;height:220px;border-radius:10px;background:var(--card);border:1px solid var(--border);';

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: text-based summary
    const fallback = document.createElement('div');
    fallback.style.cssText = 'padding:12px;font-size:0.7rem;color:var(--text-dim);';
    const validPoints = moodLine.filter((p) => p.value !== null);
    if (validPoints.length > 0) {
      const avg = validPoints.reduce((s, p) => s + p.value!, 0) / validPoints.length;
      fallback.textContent = `Average mood score: ${avg.toFixed(1)} (${avg > 2.5 ? 'Calm' : avg >= 1.5 ? 'Mixed' : 'Stormy'})`;
    } else {
      fallback.textContent = 'No mood data available for chart.';
    }
    chartContainer.appendChild(fallback);
    return;
  }

  // Chart margins
  const marginLeft = 52;
  const marginRight = 45;
  const marginTop = 15;
  const marginBottom = 28;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Horizontal grid lines at Calm/Mixed/Stormy
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = marginTop + (i / 2) * chartH;
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + chartW, y);
    ctx.stroke();
  }

  // Y-axis labels (left: mood)
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#999';
  ctx.textAlign = 'right';
  ctx.fillText('Calm ☀️', marginLeft - 4, marginTop + 4);
  ctx.fillText('Mixed ⛅', marginLeft - 4, marginTop + chartH / 2 + 3);
  ctx.fillText('Stormy ⛈️', marginLeft - 4, marginTop + chartH + 3);

  // Compute event type lines
  const eventLines: { type: EventType; points: RollingDataPoint[]; color: string }[] = [];
  let maxEventCount = 0;
  for (let i = 0; i < selectedTypes.length; i++) {
    const points = computeRollingEventCount(aggregates, selectedTypes[i], WINDOW_SIZE);
    const max = Math.max(...points.map((p) => p.value ?? 0));
    if (max > maxEventCount) maxEventCount = max;
    eventLines.push({ type: selectedTypes[i], points, color: OVERLAY_COLORS[i] });
  }

  // Y-axis labels (right: event count)
  if (eventLines.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillText(`${maxEventCount || 1} events`, width - marginRight + 4, marginTop + 4);
    ctx.fillText('0', width - marginRight + 4, marginTop + chartH + 3);
  }

  // Draw mood line with smooth color gradient (each segment colored by its value)
  const numPoints = moodLine.length;
  if (numPoints > 1) {
    const step = chartW / (numPoints - 1);

    for (let i = 1; i < numPoints; i++) {
      const prev = moodLine[i - 1];
      const curr = moodLine[i];
      if (prev.value === null || curr.value === null) continue;

      const x1 = marginLeft + (i - 1) * step;
      const x2 = marginLeft + i * step;
      const y1 = marginTop + chartH - ((prev.value - 1) / 2) * chartH;
      const y2 = marginTop + chartH - ((curr.value - 1) / 2) * chartH;

      // Use gradient stroke for this segment
      const grad = ctx.createLinearGradient(x1, 0, x2, 0);
      grad.addColorStop(0, moodValueToColor(prev.value));
      grad.addColorStop(1, moodValueToColor(curr.value));

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Draw event type overlay lines (skip leading zeros — only start from first non-zero)
  for (const line of eventLines) {
    const pts = line.points;
    if (pts.length < 2 || maxEventCount === 0) continue;
    const step = chartW / (pts.length - 1);

    // Find first non-zero point
    let firstNonZero = -1;
    for (let i = 0; i < pts.length; i++) {
      if ((pts[i].value ?? 0) > 0) { firstNonZero = i; break; }
    }
    if (firstNonZero < 0) continue;

    ctx.beginPath();
    let started = false;
    for (let i = firstNonZero; i < pts.length; i++) {
      const val = pts[i].value ?? 0;
      const x = marginLeft + i * step;
      const y = marginTop + chartH - (val / maxEventCount) * chartH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // X-axis date labels (show ~5 evenly spaced dates)
  if (moodLine.length > 1) {
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    const step = chartW / (moodLine.length - 1);
    const labelIndices = [0, Math.floor(moodLine.length / 4), Math.floor(moodLine.length / 2), Math.floor(3 * moodLine.length / 4), moodLine.length - 1];
    for (const idx of labelIndices) {
      const pt = moodLine[idx];
      if (!pt) continue;
      const x = marginLeft + idx * step;
      // Format as "Apr 28"
      const d = new Date(pt.dateKey + 'T12:00:00');
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, marginTop + chartH + 16);
    }
  }

  chartContainer.appendChild(canvas);

  // Chart legend
  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:6px;padding:6px 8px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-size:0.58rem;color:var(--text-dim);';

  // Mood line legend
  const moodLegendRow = document.createElement('div');
  moodLegendRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
  moodLegendRow.innerHTML = `
    <span style="display:inline-flex;align-items:center;">
      <span style="width:40px;height:4px;border-radius:2px;display:inline-block;background:linear-gradient(90deg, #EB5757, #F2C94C, #7FBF9F);"></span>
    </span>
    <span><strong>Mood line</strong> (left axis) — 7-day rolling average. Color shifts smoothly: red = stormy, amber = mixed, green = calm.</span>`;
  legend.appendChild(moodLegendRow);

  // Event overlay legend
  if (eventLines.length > 0) {
    const overlayRow = document.createElement('div');
    overlayRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;';
    for (const line of eventLines) {
      const item = document.createElement('span');
      item.style.cssText = 'display:flex;align-items:center;gap:3px;';
      item.innerHTML = `<span style="width:10px;height:2px;background:${line.color};border-radius:2px;display:inline-block;border-top:1px dashed ${line.color};"></span>${TYPE_EMOJIS[line.type] ?? ''} ${line.type.replace(/_/g, ' ')} <span style="color:var(--text-muted)">(7-day count, right axis)</span>`;
      overlayRow.appendChild(item);
    }
    legend.appendChild(overlayRow);
  } else {
    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:2px;color:var(--text-muted);';
    hint.textContent = 'Select event types above to overlay their 7-day rolling frequency (dashed lines). The line shows how many times that event occurred in the past 7 days — it rises when frequency increases and drops when it decreases.';
    legend.appendChild(hint);
  }

  chartContainer.appendChild(legend);

  // Tooltip on tap
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'display:none;position:absolute;padding:4px 8px;background:var(--text);color:white;border-radius:6px;font-size:0.58rem;white-space:nowrap;z-index:10;pointer-events:none;';
  chartContainer.appendChild(tooltip);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const tapX = ((e.clientX - rect.left) / rect.width) * width - marginLeft;
    if (tapX < 0 || tapX > chartW) { tooltip.style.display = 'none'; return; }

    const nearest = findNearestPoint(moodLine, tapX, chartW);
    if (!nearest) return;

    let text = `${nearest.dateKey} · mood: ${nearest.value !== null ? nearest.value.toFixed(1) : '—'}`;
    for (const line of eventLines) {
      const pt = line.points.find((p) => p.dateKey === nearest.dateKey);
      if (pt) text += ` · ${line.type.replace(/_/g, ' ')}: ${pt.value ?? 0}`;
    }

    tooltip.textContent = text;
    tooltip.style.display = 'block';
    const pxX = ((e.clientX - rect.left) / rect.width) * 100;
    tooltip.style.left = `${pxX}%`;
    tooltip.style.top = '-24px';
    tooltip.style.transform = 'translateX(-50%)';
    setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
  });
}
