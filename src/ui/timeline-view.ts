import type { DataStore } from '@src/data-store/data-store.js';
import type { EventCaptureSystem } from '@src/event-capture/event-capture-system.js';
import type { ContextEngine } from '@src/context-engine/context-engine.js';
import type { Event, EventType, ContextEntry } from '@src/models/index.js';
import { createHeaderWithPhoto } from './header-with-photo.js';

export interface TimelineViewDeps {
  dataStore: DataStore;
  eventCaptureSystem: EventCaptureSystem;
  contextEngine: ContextEngine;
  activeChildProfileId: () => string | null;
  /** Sort mode for events: 'chronological' = by day order, 'chronological-asc' = reversed, 'logged' = by createdAt (default) */
  sortMode?: 'chronological' | 'chronological-asc' | 'logged';
}

const BATCH_SIZE = 20;

const ALL_EVENT_TYPES: EventType[] = [
  'mood', 'sleep', 'good_sleep', 'poor_sleep', 'diet', 'screen_time', 'physical_wellness', 'medication',
  'meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior',
  'playdate', 'watched_tv', 'sick', 'family_adventure', 'played_outside',
  'didnt_eat_dinner', 'wet_bed', 'great_day', 'good_dinner', 'drew_comics',
  'stayed_home', 'aggression', 'fast_food', 'sugar', 'poor_transitions', 'chores', 'focus', 'reading', 'kindness',
  'refusal', 'sibling_harmony', 'bad_language', 'injury', 'sneaky', 'messy', 'helpful', 'video_games', 'toilet_issue', 'dad_bonding', 'mom_bonding', 'travel',
];

interface TimelineState {
  offset: number;
  filterEventTypes: EventType[];
  filterTags: string[];
  filterDateStart: string;
  filterDateEnd: string;
  expandedEventId: string | null;
  loadedEvents: Event[];
  hasMore: boolean;
}

/**
 * Render the Timeline View into the given container.
 * Shows events in reverse chronological order with filtering, detail expansion, and pagination.
 */
export function renderTimelineView(container: HTMLElement, deps: TimelineViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">📅</span>Timeline</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  const state: TimelineState = {
    offset: 0,
    filterEventTypes: [],
    filterTags: [],
    filterDateStart: '',
    filterDateEnd: '',
    expandedEventId: null,
    loadedEvents: [],
    hasMore: true,
  };

  renderTimeline(container, deps, profileId, state);
}

function renderTimeline(
  container: HTMLElement,
  deps: TimelineViewDeps,
  profileId: string,
  state: TimelineState,
): void {
  container.innerHTML = '';

  // Header with photo
  container.appendChild(createHeaderWithPhoto('📅', 'Timeline', profileId));

  // Filter controls — collapsed by default
  const filterCard = document.createElement('div');
  filterCard.className = 'soft-card';
  filterCard.style.cssText = 'padding:12px 18px;';

  const filterToggle = document.createElement('button');
  filterToggle.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;border:none;background:none;cursor:pointer;padding:0;';
  filterToggle.innerHTML = `<span style="font-size:0.68rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;">Filters</span><span style="font-size:0.7rem;color:var(--text-muted);transition:transform 0.2s;" id="filter-chevron">▸</span>`;

  const filterContent = document.createElement('div');
  filterContent.style.cssText = 'display:none;margin-top:10px;';

  filterToggle.addEventListener('click', () => {
    const isHidden = filterContent.style.display === 'none';
    filterContent.style.display = isHidden ? 'block' : 'none';
    const chevron = filterToggle.querySelector('#filter-chevron') as HTMLElement;
    if (chevron) chevron.textContent = isHidden ? '▾' : '▸';
  });

  filterCard.appendChild(filterToggle);

  // Event type filter
  const typeSelect = document.createElement('select');
  typeSelect.style.cssText = 'width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:8px;background:white;color:var(--text);';
  typeSelect.innerHTML = '<option value="">All event types</option>';
  for (const t of ALL_EVENT_TYPES) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = `${getTimelineEmoji(t)} ${formatEventType(t)}`;
    if (state.filterEventTypes.includes(t)) opt.selected = true;
    typeSelect.appendChild(opt);
  }
  typeSelect.addEventListener('change', () => {
    state.filterEventTypes = typeSelect.value ? [typeSelect.value as EventType] : [];
    state.offset = 0;
    state.loadedEvents = [];
    state.hasMore = true;
    renderTimeline(container, deps, profileId, state);
  });
  filterContent.appendChild(typeSelect);

  // Tag filter
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.placeholder = 'Filter by tag...';
  tagInput.value = state.filterTags.join(', ');
  tagInput.style.cssText = 'width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:8px;background:white;color:var(--text);box-sizing:border-box;';
  tagInput.addEventListener('change', () => {
    state.filterTags = tagInput.value.split(',').map((t) => t.trim()).filter(Boolean);
    state.offset = 0;
    state.loadedEvents = [];
    state.hasMore = true;
    renderTimeline(container, deps, profileId, state);
  });
  filterContent.appendChild(tagInput);

  // Date range
  const dateRow = document.createElement('div');
  dateRow.style.cssText = 'display:flex;gap:6px;';
  const dateStart = document.createElement('input');
  dateStart.type = 'date';
  dateStart.value = state.filterDateStart;
  dateStart.style.cssText = 'flex:1;padding:6px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.68rem;color:var(--text);';
  const dateEnd = document.createElement('input');
  dateEnd.type = 'date';
  dateEnd.value = state.filterDateEnd;
  dateEnd.style.cssText = 'flex:1;padding:6px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.68rem;color:var(--text);';

  const applyDateFilter = (): void => {
    state.filterDateStart = dateStart.value;
    state.filterDateEnd = dateEnd.value;
    state.offset = 0;
    state.loadedEvents = [];
    state.hasMore = true;
    renderTimeline(container, deps, profileId, state);
  };
  dateStart.addEventListener('change', applyDateFilter);
  dateEnd.addEventListener('change', applyDateFilter);
  dateRow.appendChild(dateStart);
  dateRow.appendChild(dateEnd);
  filterContent.appendChild(dateRow);

  filterCard.appendChild(filterContent);
  container.appendChild(filterCard);

  // Load events
  const filter = buildFilter(profileId, state);
  const batch = deps.eventCaptureSystem.getEvents({
    ...filter,
    limit: BATCH_SIZE,
    offset: state.offset,
  });

  if (state.loadedEvents.length === 0) {
    let sorted = batch;
    if (deps.sortMode === 'chronological') {
      // Day order (desc): most recent day first, last event of that day first
      // "Last thing that happened today" appears at the very top
      sorted = [...batch].sort((a, b) => {
        const dayA = a.timestamp.toDateString();
        const dayB = b.timestamp.toDateString();
        if (dayA !== dayB) return b.timestamp.getTime() - a.timestamp.getTime();
        // Within same day: last logged event first
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else if (deps.sortMode === 'chronological-asc') {
      // Day order (asc): most recent day first, first event of that day first
      // "First thing that happened today" appears at the top
      sorted = [...batch].sort((a, b) => {
        const dayA = a.timestamp.toDateString();
        const dayB = b.timestamp.toDateString();
        if (dayA !== dayB) return b.timestamp.getTime() - a.timestamp.getTime();
        // Within same day: earliest logged event first
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    } else if (deps.sortMode === 'logged') {
      // Logged time: sort by createdAt descending (most recently logged first)
      sorted = [...batch].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // If no sortMode specified (normal timeline), use default order from getEvents
    state.loadedEvents = sorted;
  }
  state.hasMore = batch.length === BATCH_SIZE;

  // Context entries for background indicators
  const allContextEntries = deps.contextEngine.getContextEntries({ childProfileId: profileId });

  if (state.loadedEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'placeholder';
    empty.innerHTML = `
      <span class="placeholder-icon">🕐</span>
      <div class="placeholder-title">No events found</div>
      Try adjusting your filters or log some events first.`;
    container.appendChild(empty);
    return;
  }

  // Event list
  const eventList = document.createElement('div');
  for (const event of state.loadedEvents) {
    const card = document.createElement('div');
    card.className = 'soft-card';
    const catColor = getEventCategoryColor(event.eventType);
    const isWellness = ['mood', 'positive_behavior', 'great_day', 'good_dinner', 'drew_comics', 'stayed_home', 'chores', 'focus', 'reading', 'kindness', 'sibling_harmony', 'helpful', 'dad_bonding', 'mom_bonding', 'sleep', 'good_sleep', 'poor_sleep', 'diet', 'didnt_eat_dinner', 'physical_wellness', 'wet_bed', 'playdate', 'family_adventure', 'played_outside'].includes(event.eventType);
    const isAlert = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'sick', 'aggression', 'poor_transitions', 'refusal', 'bad_language', 'injury', 'sneaky'].includes(event.eventType);
    let cardBg = '';
    if (isWellness) cardBg = 'background:var(--tint-wellness);';
    else if (isAlert) cardBg = 'background:var(--tint-alert);';
    card.style.cssText = `cursor:pointer;border-left:3px solid ${catColor};padding:12px 14px;margin-bottom:10px;${cardBg}`;

    // Check for active context at event time
    const activeCtx = getActiveContextAtTime(allContextEntries, event.timestamp);
    if (activeCtx.length > 0) {
      card.style.background = 'var(--lavender-light)';
    }

    const isExpanded = state.expandedEventId === event.id;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="flex:1;min-width:0;">
          <span style="font-size:0.78rem;font-weight:600;color:var(--text);">${event.eventType === 'custom' && event.customEmoji ? event.customEmoji : getTimelineEmoji(event.eventType)} ${event.eventType === 'custom' && event.customLabel ? event.customLabel : formatEventType(event.eventType)}</span>
          ${event.severity ? `<span style="font-size:0.62rem;color:var(--warm);margin-left:6px;">severity ${event.severity}/5</span>` : ''}
        </div>
        <span style="font-size:0.62rem;color:var(--text-muted);flex-shrink:0;">${formatTimestamp(event.timestamp)}</span>
      </div>
      ${event.tags.length > 0 ? `<div style="margin-top:3px;">${event.tags.map((t) => `<span style="display:inline-block;padding:2px 7px;margin:1px 2px 1px 0;border-radius:10px;font-size:0.6rem;background:var(--blue-light);color:var(--blue);">${t}</span>`).join('')}</div>` : ''}
      ${event.notes && !isExpanded ? `<p style="font-size:0.7rem;color:var(--text-dim);margin:3px 0 0;line-height:1.35;">${truncate(event.notes, 80)}</p>` : ''}
      ${isExpanded ? renderEventDetail(event, activeCtx) : ''}`;

    card.addEventListener('click', () => {
      state.expandedEventId = state.expandedEventId === event.id ? null : event.id;
      renderTimeline(container, deps, profileId, state);
    });

    // Edit and delete — inline with timestamp row
    const topRow = card.querySelector('div') as HTMLElement;
    const actionsSpan = document.createElement('span');
    actionsSpan.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin-left:6px;flex-shrink:0;';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.style.cssText = 'padding:2px 4px;border:none;background:none;font-size:0.55rem;cursor:pointer;opacity:0.4;transition:opacity 0.15s;';
    editBtn.addEventListener('mouseenter', () => { editBtn.style.opacity = '0.8'; });
    editBtn.addEventListener('mouseleave', () => { editBtn.style.opacity = '0.4'; });
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTimelineNoteModal(container, deps, profileId, state, event);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.style.cssText = 'padding:2px 5px;border:1px solid var(--danger);border-radius:5px;background:rgba(235,87,87,0.06);font-size:0.5rem;cursor:pointer;color:var(--danger);opacity:0.5;transition:opacity 0.15s;';
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0.5'; });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTimelineDeleteConfirm(container, deps, profileId, state, event);
    });

    actionsSpan.appendChild(editBtn);
    actionsSpan.appendChild(deleteBtn);
    topRow.appendChild(actionsSpan);

    eventList.appendChild(card);
  }
  container.appendChild(eventList);

  // Load more button
  if (state.hasMore) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.textContent = 'Load more...';
    loadMoreBtn.style.cssText = 'width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--card);font-size:0.78rem;cursor:pointer;color:var(--accent);margin-top:8px;';
    loadMoreBtn.addEventListener('click', () => {
      state.offset += BATCH_SIZE;
      const nextBatch = deps.eventCaptureSystem.getEvents({
        ...buildFilter(profileId, state),
        limit: BATCH_SIZE,
        offset: state.offset,
      });
      state.loadedEvents = [...state.loadedEvents, ...nextBatch];
      state.hasMore = nextBatch.length === BATCH_SIZE;
      renderTimeline(container, deps, profileId, state);
    });
    container.appendChild(loadMoreBtn);
  }
}

function buildFilter(profileId: string, state: TimelineState) {
  const filter: {
    childProfileId: string;
    eventTypes?: EventType[];
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  } = { childProfileId: profileId };

  if (state.filterEventTypes.length > 0) {
    filter.eventTypes = state.filterEventTypes;
  }
  if (state.filterTags.length > 0) {
    filter.tags = state.filterTags;
  }
  if (state.filterDateStart || state.filterDateEnd) {
    filter.dateRange = {
      start: state.filterDateStart ? new Date(state.filterDateStart) : new Date(0),
      end: state.filterDateEnd ? new Date(state.filterDateEnd + 'T23:59:59') : new Date(),
    };
  }
  return filter;
}

function renderEventDetail(event: Event, activeCtx: ContextEntry[]): string {
  let html = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">';

  if (event.notes) {
    html += `<p style="font-size:0.72rem;color:var(--text);margin:0 0 8px;line-height:1.5;">${event.notes}</p>`;
  }

  html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:4px;">Source: ${event.source}</div>`;

  if (event.persons.length > 0) {
    html += `<div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:4px;">People: ${event.persons.join(', ')}</div>`;
  }

  if (event.transcript) {
    html += `<div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:4px;font-style:italic;">"${event.transcript}"</div>`;
  }

  if (event.tags.length > 0) {
    html += `<div style="margin-bottom:4px;">${event.tags.map((t) => `<span style="display:inline-block;padding:2px 8px;margin:2px 3px 2px 0;border-radius:10px;font-size:0.62rem;background:var(--blue-light);color:var(--blue);">${t}</span>`).join('')}</div>`;
  }

  if (activeCtx.length > 0) {
    html += '<div style="margin-top:6px;"><span style="font-size:0.62rem;font-weight:600;color:var(--lavender);">Active context:</span>';
    for (const ctx of activeCtx) {
      html += `<span style="display:inline-block;padding:2px 8px;margin:2px 3px;border-radius:10px;font-size:0.6rem;background:var(--lavender-light);color:var(--lavender);">${ctx.contextType}: ${ctx.subType}</span>`;
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function getActiveContextAtTime(entries: ContextEntry[], timestamp: Date): ContextEntry[] {
  const t = timestamp.getTime();
  return entries.filter((ctx) => {
    const start = ctx.startTime.getTime();
    const end = ctx.endTime ? ctx.endTime.getTime() : Date.now();
    return t >= start && t <= end;
  });
}

function formatEventType(type: EventType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '…';
}

function showTimelineNoteModal(
  container: HTMLElement,
  deps: TimelineViewDeps,
  profileId: string,
  state: TimelineState,
  event: Event,
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);';

  const title = document.createElement('div');
  title.textContent = '✏️ Edit note';
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:8px;';
  card.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.value = event.notes ?? '';
  textarea.placeholder = 'Add context about this event...';
  textarea.style.cssText = 'width:100%;min-height:60px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:0.72rem;font-family:inherit;color:var(--text);background:white;resize:vertical;box-sizing:border-box;line-height:1.4;';
  textarea.rows = 3;
  card.appendChild(textarea);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:10px;background:var(--accent);font-size:0.72rem;font-weight:600;cursor:pointer;color:white;';
  saveBtn.addEventListener('click', () => {
    overlay.remove();
    const updated = { ...event, notes: textarea.value.trim() || undefined };
    deps.dataStore.saveEvent(updated);
    renderTimeline(container, deps, profileId, state);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);
  setTimeout(() => textarea.focus(), 50);
}

function showTimelineDeleteConfirm(
  container: HTMLElement,
  deps: TimelineViewDeps,
  profileId: string,
  state: TimelineState,
  event: Event,
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);text-align:center;';

  card.innerHTML = `
    <div style="font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:6px;">Delete this event?</div>
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:4px;">${formatEventType(event.eventType)} — ${formatTimestamp(event.timestamp)}</div>
    <div style="font-size:0.68rem;font-weight:600;color:var(--danger);margin-bottom:12px;">⚠️ This action cannot be undone.</div>`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Keep';
  cancelBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Delete';
  confirmBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:10px;background:var(--danger);font-size:0.72rem;font-weight:600;cursor:pointer;color:white;';
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    deps.eventCaptureSystem.deleteEvent(event.id);
    // Remove from loaded events and re-render
    state.loadedEvents = state.loadedEvents.filter((e) => e.id !== event.id);
    renderTimeline(container, deps, profileId, state);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);
}


function getEventCategoryColor(type: EventType): string {
  switch (type) {
    case 'mood':
    case 'positive_behavior':
    case 'great_day':
    case 'good_dinner':
    case 'drew_comics':
    case 'stayed_home':
    case 'chores':
    case 'focus':
    case 'reading':
    case 'kindness':
    case 'playdate':
    case 'family_adventure':
    case 'played_outside':
      return '#7FBF9F'; // sage — wellness/positive
    case 'sleep':
    case 'good_sleep':
    case 'poor_sleep':
    case 'diet':
    case 'didnt_eat_dinner':
    case 'physical_wellness':
    case 'wet_bed':
      return '#4A90E2'; // blue — physical
    case 'meltdown':
    case 'shutdown':
    case 'conflict':
    case 'school_incident':
    case 'sick':
    case 'aggression':
    case 'poor_transitions':
      return '#EB5757'; // red — alert
    case 'medication':
      return '#9b8ec4'; // lavender — medical
    case 'screen_time':
    case 'watched_tv':
    case 'fast_food':
    case 'sugar':
      return '#F2C94C'; // amber — neutral
    default:
      return '#B2BEC3'; // muted
  }
}


function getTimelineEmoji(type: EventType): string {
  const map: Record<string, string> = {
    meltdown: '🌊', shutdown: '🔇', conflict: '💢', school_incident: '🏫',
    positive_behavior: '🌟', great_day: '🌟', mood: '😊',
    overwhelm: '😢', naughty: '😈',
    sleep: '😴', good_sleep: '😴', poor_sleep: '😵',
    diet: '🍎', screen_time: '📱', physical_wellness: '🤒', medication: '💊',
    playdate: '👫', watched_tv: '📺', sick: '🤒', family_adventure: '🏕️', played_outside: '🌳',
    didnt_eat_dinner: '🍽️', wet_bed: '🛏️', good_dinner: '🍎', drew_comics: '🦸',
    stayed_home: '🏠', aggression: '😡', fast_food: '🍟', sugar: '🍬', poor_transitions: '🎢',
    good_breakfast: '🍳', tired: '🥱', sports: '🏀', party: '🥳', bounceback: '🐦‍🔥',
    chores: '🧹',
    focus: '🔎',
    reading: '📚',
    kindness: '🫶',
    refusal: '🙅',
    sibling_harmony: '🫂',
    bad_language: '🤬',
    injury: '🤕',
    sneaky: '🥷',
    video_games: '🎮',
    toilet_issue: '🚽',
    messy: '🫗',
    helpful: '🤝',
    dad_bonding: '👨',
    mom_bonding: '👩',
    travel: '✈️',
  };
  return map[type] ?? '📝';
}
