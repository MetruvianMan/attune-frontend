import type { DataStore } from '@src/data-store/data-store.js';
import type { EventCaptureSystem } from '@src/event-capture/event-capture-system.js';
import type { QuickTapLogger } from '@src/event-capture/quick-tap-logger.js';
import type { ContextEngine } from '@src/context-engine/context-engine.js';
import type { Event, EventType, QuickTapEventType, MoodColor, DayMood } from '@src/models/index.js';
import { createHeaderWithPhoto } from './header-with-photo.js';
import { createEmojiPicker } from './emoji-picker.js';
import { extractEventsFromTranscript, getOpenAIKey, debugKeyStatus, transcribeWithWhisper } from '@src/llm/browser-openai.js';

export interface TodayViewDeps {
  dataStore: DataStore;
  eventCaptureSystem: EventCaptureSystem;
  quickTapLogger: QuickTapLogger;
  contextEngine: ContextEngine;
  activeChildProfileId: () => string | null;
  onDataChange?: () => void;
}

/**
 * Render the Today View into the given container.
 * Shows today's events grouped by type, quick-tap buttons, latest insight/strategy,
 * active context entries, and a voice logger button.
 */
export function renderTodayView(container: HTMLElement, deps: TodayViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">🌿</span>Today</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  // Header with photo
  container.appendChild(createHeaderWithPhoto('🌿', 'Today', profileId));

  // Date picker for backfilling past days
  let selectedDate = new Date();
  const dateRow = document.createElement('div');
  dateRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

  const todayLabel = document.createElement('span');
  todayLabel.style.cssText = 'font-size:0.72rem;color:var(--text-dim);';
  todayLabel.textContent = 'Logging for:';
  dateRow.appendChild(todayLabel);

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = toDateInputValue(selectedDate);
  dateInput.max = toDateInputValue(new Date());
  dateInput.style.cssText = 'flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:0.7rem;color:var(--text);background:white;';
  dateInput.addEventListener('change', () => {
    selectedDate = new Date(dateInput.value + 'T12:00:00');
    renderTodayForDate(container, deps, profileId, selectedDate);
  });
  dateRow.appendChild(dateInput);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Today';
  resetBtn.style.cssText = 'padding:6px 10px;border:1px solid var(--accent);border-radius:var(--radius-input);background:var(--accent-light);font-size:0.65rem;cursor:pointer;color:var(--accent);font-weight:600;';
  resetBtn.addEventListener('click', () => {
    selectedDate = new Date();
    dateInput.value = toDateInputValue(selectedDate);
    renderTodayForDate(container, deps, profileId, selectedDate);
  });
  dateRow.appendChild(resetBtn);
  container.appendChild(dateRow);

  renderTodayForDate(container, deps, profileId, selectedDate);
}

function renderTodayForDate(
  container: HTMLElement,
  deps: TodayViewDeps,
  profileId: string,
  selectedDate: Date,
): void {
  // Remove everything after the date row (keep header + date picker)
  const dateRow = container.children[1]; // header is [0], dateRow is [1]
  while (container.children.length > 2) {
    container.removeChild(container.lastChild!);
  }

  const isToday = toDateInputValue(selectedDate) === toDateInputValue(new Date());

  // Get events for the selected day
  const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  const dayEvents = deps.eventCaptureSystem.getEvents({
    childProfileId: profileId,
    dateRange: { start: startOfDay, end: endOfDay },
  });

  // Active context entries (only show for today)
  if (isToday) {
    const activeContextEntries = deps.contextEngine.getActiveContextEntries(profileId);
    if (activeContextEntries.length > 0) {
      const ctxCard = document.createElement('div');
      ctxCard.className = 'soft-card';
      ctxCard.style.cssText = 'padding:10px 12px;margin-bottom:8px;';
      ctxCard.innerHTML = `<h2 style="margin-bottom:4px;">Active Context</h2>`;
      const ctxList = document.createElement('div');
      for (const ctx of activeContextEntries) {
        const badge = document.createElement('span');
        badge.textContent = `${ctx.contextType}: ${ctx.subType}`;
        badge.style.cssText = 'display:inline-block;padding:3px 8px;margin:2px 3px 2px 0;border-radius:10px;font-size:0.65rem;background:var(--lavender-light);color:var(--lavender);';
        ctxList.appendChild(badge);
      }
      ctxCard.appendChild(ctxList);
      container.appendChild(ctxCard);
    }
  } else {
    // Show backfill indicator
    const backfillNote = document.createElement('div');
    backfillNote.style.cssText = 'text-align:center;padding:4px;font-size:0.65rem;color:var(--warm);margin-bottom:6px;';
    backfillNote.textContent = `📅 Logging for ${selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`;
    container.appendChild(backfillNote);
  }

  // Daily mood strip (red / amber / green)
  const dateKey = toDateInputValue(selectedDate);
  renderMoodStrip(container, deps, profileId, dateKey, dayEvents, () => {
    renderTodayForDate(container, deps, profileId, selectedDate);
  });

  // Event list with drag-and-drop reorder
  if (dayEvents.length > 0) {
    // Ensure all events have sequenceOrder assigned
    let needsReindex = dayEvents.some((e) => e.sequenceOrder === undefined);
    if (needsReindex) {
      dayEvents.forEach((e, i) => {
        if (e.sequenceOrder === undefined) {
          const updated = { ...e, sequenceOrder: i };
          deps.dataStore.saveEvent(updated);
          (e as any).sequenceOrder = i;
        }
      });
      deps.onDataChange?.();
    }
    // Sort by sequenceOrder for display
    dayEvents.sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));

    const summaryCard = document.createElement('div');
    summaryCard.className = 'soft-card';
    summaryCard.style.cssText = 'padding:10px 12px;margin-bottom:8px;';
    summaryCard.innerHTML = `<h2 style="margin-bottom:4px;">Events (${dayEvents.length})</h2>`;

    const eventList = document.createElement('div');
    eventList.style.cssText = 'position:relative;';

    // Drag state
    let dragIdx: number | null = null;
    let dragEl: HTMLElement | null = null;
    let placeholder: HTMLElement | null = null;
    let touchStartY = 0;
    let touchOffsetY = 0;
    const rows: HTMLElement[] = [];

    for (let idx = 0; idx < dayEvents.length; idx++) {
      const event = dayEvents[idx];
      const row = document.createElement('div');
      row.dataset.idx = String(idx);
      row.draggable = true;
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);transition:transform 0.15s,opacity 0.15s;cursor:grab;user-select:none;-webkit-user-select:none;';
      rows.push(row);

      // Drag handle + info
      const dragHandle = document.createElement('span');
      dragHandle.textContent = '⠿';
      dragHandle.style.cssText = 'font-size:0.85rem;color:var(--text-muted);opacity:0.4;margin-right:8px;flex-shrink:0;cursor:grab;touch-action:none;';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      let infoHtml = `
        <span style="font-size:0.78rem;font-weight:600;color:var(--text);">${event.eventType === 'custom' && event.customEmoji ? event.customEmoji : getEventEmoji(event.eventType)} ${event.eventType === 'custom' && event.customLabel ? event.customLabel : formatEventType(event.eventType)}</span>
        <span style="font-size:0.62rem;color:var(--text-muted);margin-left:6px;">${event.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        ${event.severity ? `<span style="font-size:0.6rem;color:var(--warm);margin-left:4px;">·${event.severity}/5</span>` : ''}`;
      if (event.notes) {
        infoHtml += `<div style="font-size:0.62rem;color:var(--text-dim);margin-top:2px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${event.notes}</div>`;
      }
      info.innerHTML = infoHtml;

      // Action buttons container
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:6px;';

      // Pencil edit button — low visual weight
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.style.cssText = 'padding:3px 5px;border:none;background:none;font-size:0.6rem;cursor:pointer;opacity:0.45;transition:opacity 0.15s;';
      editBtn.addEventListener('mouseenter', () => { editBtn.style.opacity = '0.8'; });
      editBtn.addEventListener('mouseleave', () => { editBtn.style.opacity = '0.45'; });
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showNoteModal(container, event.notes ?? '', (note) => {
          const updated = { ...event, notes: note || undefined };
          deps.dataStore.saveEvent(updated);
          deps.onDataChange?.();
          renderTodayForDate(container, deps, profileId, selectedDate);
        });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'padding:4px 8px;border:1px solid var(--danger);border-radius:8px;background:rgba(199,92,92,0.08);font-size:0.65rem;cursor:pointer;color:var(--danger);';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deps.eventCaptureSystem.deleteEvent(event.id);
        deps.onDataChange?.();
        renderTodayForDate(container, deps, profileId, selectedDate);
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(dragHandle);
      row.appendChild(info);
      row.appendChild(actions);

      // HTML5 drag events (desktop)
      row.addEventListener('dragstart', (e) => {
        dragIdx = idx;
        dragEl = row;
        row.style.opacity = '0.4';
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', String(idx));
      });
      row.addEventListener('dragend', () => {
        if (dragEl) dragEl.style.opacity = '1';
        dragIdx = null;
        dragEl = null;
        if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        const targetIdx = parseInt(row.dataset.idx!, 10);
        if (dragIdx !== null && targetIdx !== dragIdx) {
          row.style.borderTop = '2px solid var(--accent)';
        }
      });
      row.addEventListener('dragleave', () => {
        row.style.borderTop = '';
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.style.borderTop = '';
        const fromIdx = parseInt(e.dataTransfer!.getData('text/plain'), 10);
        const toIdx = parseInt(row.dataset.idx!, 10);
        if (fromIdx !== toIdx) {
          reorderEvents(deps, dayEvents, fromIdx, toIdx);
          renderTodayForDate(container, deps, profileId, selectedDate);
        }
      });

      // Touch events (mobile drag-and-drop)
      dragHandle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        dragIdx = idx;
        dragEl = row;
        const touch = e.touches[0];
        touchStartY = touch.clientY;
        const rect = row.getBoundingClientRect();
        touchOffsetY = touch.clientY - rect.top;
        row.style.zIndex = '10';
        row.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        row.style.background = 'var(--card)';
        row.style.borderRadius = '8px';
      }, { passive: false });

      dragHandle.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (dragIdx === null || !dragEl) return;
        const touch = e.touches[0];
        const dy = touch.clientY - touchStartY;
        dragEl.style.transform = `translateY(${dy}px)`;

        // Find which row we're hovering over
        for (const r of rows) {
          if (r === dragEl) continue;
          const rect = r.getBoundingClientRect();
          if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
            r.style.borderTop = '2px solid var(--accent)';
          } else {
            r.style.borderTop = '';
          }
        }
      }, { passive: false });

      dragHandle.addEventListener('touchend', (e) => {
        if (dragIdx === null || !dragEl) return;
        const touch = e.changedTouches[0];
        dragEl.style.transform = '';
        dragEl.style.zIndex = '';
        dragEl.style.boxShadow = '';
        dragEl.style.background = '';
        dragEl.style.borderRadius = '';

        // Find drop target
        let targetIdx = dragIdx;
        for (const r of rows) {
          r.style.borderTop = '';
          if (r === dragEl) continue;
          const rect = r.getBoundingClientRect();
          if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
            targetIdx = parseInt(r.dataset.idx!, 10);
            break;
          }
        }

        if (targetIdx !== dragIdx) {
          reorderEvents(deps, dayEvents, dragIdx, targetIdx);
          renderTodayForDate(container, deps, profileId, selectedDate);
        }
        dragIdx = null;
        dragEl = null;
      });

      eventList.appendChild(row);
    }
    summaryCard.appendChild(eventList);
    container.appendChild(summaryCard);
  } else {
    const emptyCard = document.createElement('div');
    emptyCard.style.cssText = 'text-align:center;padding:4px 16px;color:var(--text-dim);font-size:0.72rem;line-height:1.3;';
    emptyCard.innerHTML = `<span style="font-size:1.1rem;">☀️</span> <span style="font-weight:600;color:var(--text);">No events logged${isToday ? ' today' : ''}</span>`;
    container.appendChild(emptyCard);
  }

  // Diary entries for this day - appears right after events or in place of events if none exist
  const diaryEntries = deps.dataStore.getDiaryEntriesForDate(profileId, startOfDay);
  if (diaryEntries.length > 0) {
    const diaryCard = document.createElement('div');
    diaryCard.className = dayEvents.length > 0 ? 'soft-card' : 'section-container';
    diaryCard.style.cssText = dayEvents.length > 0 
      ? 'padding:10px 12px;margin-bottom:10px;background:linear-gradient(135deg, rgba(255,248,225,0.4), rgba(255,237,213,0.4));border:1px solid rgba(255,193,7,0.2);'
      : 'padding:14px;margin-bottom:10px;';

    const diaryHeader = document.createElement('div');
    diaryHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    
    const diaryTitle = document.createElement('h2');
    diaryTitle.textContent = dayEvents.length > 0 ? `📔 Diary (${diaryEntries.length})` : `📔 Diary Entries (${diaryEntries.length})`;
    diaryTitle.style.cssText = 'margin:0;font-size:0.82rem;color:var(--text);';
    
    diaryHeader.appendChild(diaryTitle);
    diaryCard.appendChild(diaryHeader);

    for (const entry of diaryEntries) {
      const entryRow = document.createElement('div');
      entryRow.style.cssText = 'padding:10px;margin-bottom:8px;background:white;border-radius:8px;border:1px solid rgba(255,193,7,0.15);position:relative;';

      const entryMeta = document.createElement('div');
      entryMeta.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
      
      const entryTime = document.createElement('span');
      entryTime.textContent = entry.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      entryTime.style.cssText = 'font-size:0.65rem;color:var(--text-muted);font-weight:600;';
      
      // Action buttons container
      const entryActions = document.createElement('div');
      entryActions.style.cssText = 'display:flex;align-items:center;gap:4px;';
      
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.style.cssText = 'padding:3px 7px;border:1px solid var(--accent);border-radius:6px;background:rgba(74,144,226,0.08);font-size:0.62rem;cursor:pointer;color:var(--accent);transition:all 0.15s;';
      editBtn.addEventListener('mouseenter', () => { editBtn.style.background = 'rgba(74,144,226,0.15)'; });
      editBtn.addEventListener('mouseleave', () => { editBtn.style.background = 'rgba(74,144,226,0.08)'; });
      editBtn.addEventListener('click', () => {
        showDiaryEditModal(container, entry, (updatedContent) => {
          const updated = { ...entry, content: updatedContent };
          deps.dataStore.saveDiaryEntry(updated);
          deps.onDataChange?.();
          renderTodayForDate(container, deps, profileId, selectedDate);
        });
      });
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'padding:3px 7px;border:1px solid var(--danger);border-radius:6px;background:rgba(199,92,92,0.08);font-size:0.62rem;cursor:pointer;color:var(--danger);transition:all 0.15s;';
      deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = 'rgba(199,92,92,0.15)'; });
      deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = 'rgba(199,92,92,0.08)'; });
      deleteBtn.addEventListener('click', () => {
        if (window.confirm('Delete this diary entry?')) {
          deps.dataStore.deleteDiaryEntry(entry.id);
          deps.onDataChange?.();
          renderTodayForDate(container, deps, profileId, selectedDate);
        }
      });
      
      entryActions.appendChild(editBtn);
      entryActions.appendChild(deleteBtn);
      
      entryMeta.appendChild(entryTime);
      entryMeta.appendChild(entryActions);

      const entryContent = document.createElement('div');
      entryContent.textContent = entry.content;
      entryContent.style.cssText = 'font-size:0.74rem;color:var(--text);line-height:1.5;white-space:pre-wrap;';

      entryRow.appendChild(entryMeta);
      entryRow.appendChild(entryContent);
      diaryCard.appendChild(entryRow);
    }

    container.appendChild(diaryCard);
  }

  // Quick-tap buttons
  const quickTapCard = document.createElement('div');
  quickTapCard.className = 'section-container';
  quickTapCard.style.cssText = 'padding:14px;margin-bottom:10px;';
  quickTapCard.innerHTML = '<h2 style="margin-bottom:6px;">Quick Log</h2>';

  const buttonGrid = document.createElement('div');
  buttonGrid.style.cssText = 'display:grid;grid-auto-flow:column;grid-template-rows:repeat(5, auto);grid-auto-columns:calc(50% - 3px);gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding-bottom:4px;';

  const buttons = deps.quickTapLogger.getButtons(profileId);

  // Sort buttons by usage frequency (most used first)
  // Count events by their actual eventType as stored (which is what the button maps to)
  const allEvents = deps.dataStore.getEvents({ childProfileId: profileId });
  const eventCounts = new Map<string, number>();
  for (const ev of allEvents) {
    eventCounts.set(ev.eventType, (eventCounts.get(ev.eventType) ?? 0) + 1);
  }
  // For each button, look up the count using the eventType the button produces
  // medication_given maps to 'medication', so we need a reverse lookup
  const BUTTON_TO_STORED: Record<string, string> = { medication_given: 'medication' };
  const sortedButtons = [...buttons].sort((a, b) => {
    const storedTypeA = BUTTON_TO_STORED[a.eventType] ?? a.eventType;
    const storedTypeB = BUTTON_TO_STORED[b.eventType] ?? b.eventType;
    const countA = eventCounts.get(storedTypeA) ?? 0;
    const countB = eventCounts.get(storedTypeB) ?? 0;
    if (countB !== countA) return countB - countA;
    // Tie-break: preserve original order
    return a.order - b.order;
  });

  for (const btn of sortedButtons) {
    const tapBtn = document.createElement('button');
    tapBtn.textContent = `${getQuickTapEmoji(btn.eventType)} ${btn.label}`;
    tapBtn.style.cssText = 'padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-card);background:rgba(74,144,226,0.04);font-size:0.68rem;cursor:pointer;color:var(--text);transition:all 0.12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;scroll-snap-align:start;';
    tapBtn.addEventListener('mousedown', () => { tapBtn.style.transform = 'scale(0.95)'; tapBtn.style.background = 'rgba(74,144,226,0.12)'; });
    tapBtn.addEventListener('mouseup', () => { tapBtn.style.transform = 'scale(1)'; tapBtn.style.background = 'rgba(74,144,226,0.04)'; });
    tapBtn.addEventListener('mouseleave', () => { tapBtn.style.transform = 'scale(1)'; tapBtn.style.background = 'rgba(74,144,226,0.04)'; });
    tapBtn.addEventListener('click', () => {
      // Use noon of the selected date for backfilled events, or now for today
      const logTimestamp = isToday ? new Date() : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000);
      deps.quickTapLogger.logQuickTap(profileId, btn.eventType, logTimestamp);
      deps.onDataChange?.();
      renderTodayForDate(container, deps, profileId, selectedDate);
    });
    buttonGrid.appendChild(tapBtn);
  }

  // Render saved custom event buttons with ✕ delete badge
  const savedCustomEvents = getSavedCustomEvents(profileId);
  for (const saved of savedCustomEvents) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;scroll-snap-align:start;overflow:hidden;border-radius:var(--radius-card);';

    const savedBtn = document.createElement('button');
    savedBtn.textContent = `${saved.emoji} ${saved.label}`;
    savedBtn.style.cssText = 'padding:8px 10px;border:1px dashed var(--accent);border-radius:var(--radius-card);background:rgba(74,144,226,0.06);font-size:0.68rem;cursor:pointer;color:var(--text);transition:all 0.12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;';
    savedBtn.addEventListener('mousedown', () => { savedBtn.style.transform = 'scale(0.95)'; savedBtn.style.background = 'rgba(74,144,226,0.14)'; });
    savedBtn.addEventListener('mouseup', () => { savedBtn.style.transform = 'scale(1)'; savedBtn.style.background = 'rgba(74,144,226,0.06)'; });
    savedBtn.addEventListener('mouseleave', () => { savedBtn.style.transform = 'scale(1)'; savedBtn.style.background = 'rgba(74,144,226,0.06)'; });
    savedBtn.addEventListener('click', () => {
      const logTimestamp = isToday ? new Date() : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000);
      const event = deps.eventCaptureSystem.createEvent({
        childProfileId: profileId,
        eventType: 'custom',
        timestamp: logTimestamp,
        source: 'custom',
        customLabel: saved.label,
        customEmoji: saved.emoji !== '📝' ? saved.emoji : undefined,
      });
      deps.eventCaptureSystem.saveEvent(event);
      deps.onDataChange?.();
      renderTodayForDate(container, deps, profileId, selectedDate);
    });

    // ✕ delete badge — subtle, inside the pill
    const deleteBadge = document.createElement('button');
    deleteBadge.textContent = '✕';
    deleteBadge.style.cssText = 'position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:rgba(235,87,87,0.4);color:white;border:none;font-size:0.45rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;z-index:2;opacity:0.6;transition:opacity 0.15s;';
    deleteBadge.addEventListener('mouseenter', () => { deleteBadge.style.opacity = '1'; deleteBadge.style.background = 'rgba(235,87,87,0.8)'; });
    deleteBadge.addEventListener('mouseleave', () => { deleteBadge.style.opacity = '0.6'; deleteBadge.style.background = 'rgba(235,87,87,0.4)'; });
    deleteBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.confirm(`Remove "${saved.label}" from quick access?`)) {
        removeSavedCustomEvent(profileId, saved.label);
        renderTodayForDate(container, deps, profileId, selectedDate);
      }
    });

    wrapper.appendChild(savedBtn);
    wrapper.appendChild(deleteBadge);
    buttonGrid.appendChild(wrapper);
  }

  quickTapCard.appendChild(buttonGrid);
  container.appendChild(quickTapCard);

  // Voice logger button — real browser speech recognition
  const voiceBtn = document.createElement('button');
  voiceBtn.innerHTML = '🎙️ Start Voice Log';
  voiceBtn.style.cssText = 'display:block;width:100%;padding:12px;border:none;border-radius:var(--radius-btn);background:var(--gradient-primary);color:white;font-size:0.8rem;font-weight:600;cursor:pointer;margin-bottom:10px;box-shadow:0 4px 12px rgba(74,144,226,0.2);transition:transform 0.1s;';

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let isRecording = false;

  voiceBtn.addEventListener('click', async () => {
    if (isRecording && mediaRecorder) {
      // Stop recording
      mediaRecorder.stop();
      return;
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      showVoiceResultModal(container, deps, profileId, selectedDate, isToday, startOfDay, '', true);
      return;
    }

    try {
      // Request audio with balanced quality settings
      // Note: Too aggressive constraints can cause some browsers to fail silently
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      });
      audioChunks = [];
      // Safari doesn't support audio/webm — detect supported format
      let mimeType = 'audio/webm;codecs=opus';
      let options: MediaRecorderOptions = { mimeType, audioBitsPerSecond: 128000 };
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        options = { mimeType, audioBitsPerSecond: 128000 };
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        options = { mimeType, audioBitsPerSecond: 128000 };
      }
      
      console.log('Starting recording with:', options);
      
      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
        } else {
          console.warn('Empty audio chunk received');
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((t) => t.stop());
        isRecording = false;
        voiceBtn.innerHTML = '⏳ Transcribing...';
        voiceBtn.style.background = 'var(--warm)';

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        
        // Log audio details for debugging
        console.log('=== AUDIO RECORDING DETAILS ===');
        console.log('Audio blob size:', audioBlob.size, 'bytes (', (audioBlob.size / 1024).toFixed(2), 'KB)');
        console.log('Audio type:', audioBlob.type);
        console.log('Number of chunks:', audioChunks.length);
        console.log('Mime type used:', mimeType);
        
        // Create a temporary audio element to test playback
        const testAudio = new Audio(URL.createObjectURL(audioBlob));
        testAudio.onloadedmetadata = () => {
          console.log('Audio duration:', testAudio.duration, 'seconds');
        };
        testAudio.onerror = (e) => {
          console.error('Audio playback test failed:', e);
        };
        console.log('===============================');
        
        // Check if audio blob is too small (likely silence or error)
        if (audioBlob.size < 1000) {
          voiceBtn.innerHTML = '🎙️ Start Voice Log';
          voiceBtn.style.background = 'var(--accent)';
          showVoiceResultModal(container, deps, profileId, selectedDate, isToday, startOfDay,
            '(Recording too short or empty - please try again)', true);
          return;
        }

        try {
          const transcript = await transcribeWithWhisper(audioBlob, apiKey, ext);
          console.log('Transcription result:', transcript);
          voiceBtn.innerHTML = '🎙️ Start Voice Log';
          voiceBtn.style.background = 'var(--accent)';
          
          // Store audio blob for playback testing
          (window as any).__lastAudioBlob = audioBlob;
          console.log('💡 TIP: Test playback with: new Audio(URL.createObjectURL(window.__lastAudioBlob)).play()');
          
          showVoiceResultModal(container, deps, profileId, selectedDate, isToday, startOfDay,
            transcript.trim(), transcript.trim().length === 0);
        } catch (err) {
          console.error('Transcription error:', err);
          voiceBtn.innerHTML = '🎙️ Start Voice Log';
          voiceBtn.style.background = 'var(--accent)';
          showVoiceResultModal(container, deps, profileId, selectedDate, isToday, startOfDay,
            `(Transcription error: ${err instanceof Error ? err.message : 'unknown'})`, true);
        }
      };

      mediaRecorder.start();
      isRecording = true;
      voiceBtn.innerHTML = '🔴 Recording... tap to stop';
      voiceBtn.style.background = 'var(--danger)';
    } catch (err) {
      showVoiceResultModal(container, deps, profileId, selectedDate, isToday, startOfDay,
        `(Microphone error: ${err instanceof Error ? err.message : 'permission denied'})`, true);
    }
  });
  container.appendChild(voiceBtn);

  // Custom event button
  const customEventBtn = document.createElement('button');
  customEventBtn.innerHTML = '📝 Add Custom Event';
  customEventBtn.style.cssText = 'display:block;width:100%;padding:10px;border:1px dashed var(--accent);border-radius:var(--radius-btn);background:rgba(74,144,226,0.04);color:var(--accent);font-size:0.75rem;font-weight:600;cursor:pointer;margin-bottom:10px;transition:background 0.12s;';
  customEventBtn.addEventListener('mouseenter', () => { customEventBtn.style.background = 'rgba(74,144,226,0.10)'; });
  customEventBtn.addEventListener('mouseleave', () => { customEventBtn.style.background = 'rgba(74,144,226,0.04)'; });
  customEventBtn.addEventListener('click', () => {
    showCustomEventModal(container, deps, profileId, selectedDate, isToday, startOfDay, () => {
      renderTodayForDate(container, deps, profileId, selectedDate);
    });
  });
  container.appendChild(customEventBtn);

  // Latest insight or strategy
  const insights = deps.dataStore.getInsights(profileId);
  if (insights.length > 0) {
    const latestInsight = insights.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const insightCard = document.createElement('div');
    insightCard.className = 'soft-card';
    insightCard.innerHTML = `
      <h2>Latest Insight</h2>
      <p style="font-size:0.78rem;color:var(--text);line-height:1.5;margin:0;">${truncate(latestInsight.narrative, 150)}</p>
      <div style="margin-top:8px;font-size:0.65rem;color:var(--text-muted);">
        ${latestInsight.type} · ${latestInsight.confidenceScore} confidence · ${latestInsight.createdAt.toLocaleDateString()}
      </div>`;
    container.appendChild(insightCard);
  }
}

/** Swap the sequenceOrder of two events and persist. */
function swapEventOrder(deps: TodayViewDeps, events: Event[], idxA: number, idxB: number): void {
  const a = events[idxA];
  const b = events[idxB];
  const seqA = a.sequenceOrder ?? idxA;
  const seqB = b.sequenceOrder ?? idxB;
  deps.dataStore.saveEvent({ ...a, sequenceOrder: seqB });
  deps.dataStore.saveEvent({ ...b, sequenceOrder: seqA });
  deps.onDataChange?.();
}

/** Move an event from one position to another and re-index all sequence orders. */
function reorderEvents(deps: TodayViewDeps, events: Event[], fromIdx: number, toIdx: number): void {
  const moved = events.splice(fromIdx, 1)[0];
  events.splice(toIdx, 0, moved);
  // Re-index all
  for (let i = 0; i < events.length; i++) {
    deps.dataStore.saveEvent({ ...events[i], sequenceOrder: i });
  }
  deps.onDataChange?.();
}

function formatEventType(type: EventType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEventEmoji(type: EventType): string {
  const map: Record<string, string> = {
    meltdown: '🌊', shutdown: '🔇', conflict: '💢', school_incident: '🏫', school_trip: '🚌',
    positive_behavior: '🌟', great_day: '🌟', mood: '😊', sleep: '😴', good_sleep: '😴', poor_sleep: '😵',
    diet: '🍎', screen_time: '📱', physical_wellness: '🤒', medication: '💊',
    playdate: '👫', watched_tv: '📺', sick: '🤒', family_adventure: '🏕️', played_outside: '🌳',
    didnt_eat_dinner: '🍽️', wet_bed: '🛏️', good_dinner: '😋', drew_comics: '🦸',
    stayed_home: '🏠', aggression: '😠', angry: '😡', fast_food: '🍟', sugar: '🍬', poor_transitions: '🎢',
    good_breakfast: '🍳', tired: '🥱', sports: '🏀', party: '🎉', bounceback: '🐦‍🔥', brave: '🦁',
    chores: '🧹', focus: '🔎', reading: '📚', kindness: '🫶',
    overwhelm: '😢',
    naughty: '😈',
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
    barfed: '🤮',
    vacation: '🌴',
    sporting_event: '🏟️',
  };
  return map[type] ?? '📝';
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '…';
}

function getQuickTapEmoji(type: QuickTapEventType): string {
  const map: Record<QuickTapEventType, string> = {
    meltdown: '🌊',
    shutdown: '🔇',
    conflict: '⚡',
    school_incident: '🏫',
    school_trip: '🚌',
    great_day: '🌟',
    good_sleep: '😴',
    poor_sleep: '😵',
    medication_given: '💊',
    wet_bed: '🛏️',
    didnt_eat_dinner: '🍽️',
    playdate: '👫',
    watched_tv: '📺',
    sick: '🤒',
    family_adventure: '🏕️',
    played_outside: '🌳',
    good_dinner: '😋',
    drew_comics: '🦸',
    stayed_home: '🏠',
    aggression: '😠',
    angry: '😡',
    fast_food: '🍟',
    good_breakfast: '🍳',
    tired: '🥱',
    sports: '🏀',
    party: '🎉',
    bounceback: '🐦‍🔥',
    brave: '🦁',
    sugar: '🍬',
    poor_transitions: '🎢',
    chores: '🧹',
    focus: '🔎',
    reading: '📚',
    kindness: '🫶',
    overwhelm: '😢',
    naughty: '😈',
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
    barfed: '🤮',
    vacation: '🌴',
    sporting_event: '🏟️',
  };
  return map[type] ?? '📝';
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const ALL_EVENT_TYPES: EventType[] = [
  'meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior',
  'mood', 'sleep', 'diet', 'screen_time', 'physical_wellness', 'medication',
];

/**
 * Shows a modal with the voice transcript.
 * If OpenAI key is available, sends transcript for multi-event extraction.
 * Otherwise falls back to single-event keyword matching.
 */
function showVoiceResultModal(
  container: HTMLElement,
  deps: TodayViewDeps,
  profileId: string,
  selectedDate: Date,
  isToday: boolean,
  startOfDay: Date,
  transcript: string,
  editableTranscript: boolean = false,
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);max-height:80%;overflow-y:auto;';

  const title = document.createElement('div');
  title.textContent = '🎙️ Voice Log';
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:4px;';
  card.appendChild(title);

  // Debug line — remove once API is confirmed working
  const debug = document.createElement('div');
  debug.textContent = `🔧 ${debugKeyStatus()}`;
  debug.style.cssText = 'font-size:0.55rem;color:var(--text-muted);margin-bottom:6px;font-family:monospace;';
  card.appendChild(debug);

  // Transcript display/edit
  const transcriptLabel = document.createElement('div');
  transcriptLabel.textContent = editableTranscript ? 'Type what happened:' : 'What you said:';
  transcriptLabel.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
  card.appendChild(transcriptLabel);

  const transcriptInput = document.createElement('textarea');
  transcriptInput.value = transcript;
  transcriptInput.placeholder = 'Describe what happened...';
  transcriptInput.style.cssText = 'width:100%;min-height:50px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:0.75rem;color:var(--text);background:white;line-height:1.4;margin-bottom:10px;font-family:inherit;resize:vertical;box-sizing:border-box;';
  transcriptInput.rows = 2;
  card.appendChild(transcriptInput);

  // Diary checkbox
  const diaryCheckboxRow = document.createElement('label');
  diaryCheckboxRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0;margin-bottom:10px;cursor:pointer;font-size:0.72rem;color:var(--text);';
  
  const diaryCheckbox = document.createElement('input');
  diaryCheckbox.type = 'checkbox';
  diaryCheckbox.checked = false;
  diaryCheckbox.style.cssText = 'flex-shrink:0;';
  
  const diaryLabel = document.createElement('span');
  diaryLabel.textContent = '📔 Save as diary entry (won\'t affect day grade)';
  
  diaryCheckboxRow.appendChild(diaryCheckbox);
  diaryCheckboxRow.appendChild(diaryLabel);
  card.appendChild(diaryCheckboxRow);

  // Events area — will be populated by OpenAI or keyword matching
  const eventsArea = document.createElement('div');
  card.appendChild(eventsArea);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:10px;background:var(--accent);font-size:0.72rem;font-weight:600;cursor:pointer;color:white;';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);

  // Track extracted events with checkboxes and editable properties
  let eventCheckboxes: { 
    checkbox: HTMLInputElement; 
    eventType: string; 
    description: string;
    valence: 'positive' | 'neutral' | 'negative';
    emoji: string;
    emojiBtn?: HTMLButtonElement;
    valenceSelect?: HTMLSelectElement;
  }[] = [];

  const apiKey = getOpenAIKey();
  const finalTranscript = transcript.trim();

  // Update debug with transcript info
  debug.textContent += ` | Transcript: ${finalTranscript.length} chars`;

  if (apiKey && finalTranscript.length > 0) {
    // Use OpenAI for multi-event extraction
    eventsArea.innerHTML = '<div style="text-align:center;padding:12px;font-size:0.7rem;color:var(--text-dim);">🔄 Analyzing with AI...</div>';
    saveBtn.style.opacity = '0.5';
    saveBtn.style.pointerEvents = 'none';

    extractEventsFromTranscript(finalTranscript, apiKey).then((extracted) => {
      eventsArea.innerHTML = '';
      if (extracted.length === 0) {
        eventsArea.innerHTML = '<div style="font-size:0.7rem;color:var(--text-dim);padding:4px 0;">No events detected. Select a type manually:</div>';
        addFallbackTypeSelect(eventsArea);
      } else {
        const label = document.createElement('div');
        label.textContent = `Detected ${extracted.length} event${extracted.length > 1 ? 's' : ''}:`;
        label.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;';
        eventsArea.appendChild(label);

        for (const ev of extracted) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--card);';

          // Top row: checkbox, emoji button, event name
          const topRow = document.createElement('label');
          topRow.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = true;
          cb.style.cssText = 'flex-shrink:0;';

          // Emoji button (clickable to change)
          const emojiBtn = document.createElement('button');
          const initialEmoji = ev.suggestedEmoji || getEventEmoji(ev.eventType as EventType);
          emojiBtn.textContent = initialEmoji;
          emojiBtn.style.cssText = 'font-size:1.2rem;border:none;background:transparent;cursor:pointer;padding:2px;';
          emojiBtn.title = 'Click to change emoji';
          
          const eventName = document.createElement('span');
          eventName.textContent = formatEventType(ev.eventType as EventType);
          eventName.style.cssText = 'font-size:0.72rem;font-weight:600;color:var(--text);flex:1;';

          topRow.appendChild(cb);
          topRow.appendChild(emojiBtn);
          topRow.appendChild(eventName);

          // Description
          const desc = document.createElement('div');
          desc.textContent = ev.description;
          desc.style.cssText = 'font-size:0.65rem;color:var(--text-dim);margin-left:24px;';

          // Valence selector
          const valenceRow = document.createElement('div');
          valenceRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:24px;margin-top:2px;';
          
          const valenceLabel = document.createElement('span');
          valenceLabel.textContent = 'Impact:';
          valenceLabel.style.cssText = 'font-size:0.62rem;color:var(--text-dim);';
          
          const valenceSelect = document.createElement('select');
          valenceSelect.style.cssText = 'font-size:0.65rem;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:white;color:var(--text);';
          valenceSelect.innerHTML = `
            <option value="positive" ${ev.valence === 'positive' ? 'selected' : ''}>✅ Positive</option>
            <option value="neutral" ${ev.valence === 'neutral' ? 'selected' : ''}>➖ Neutral</option>
            <option value="negative" ${ev.valence === 'negative' ? 'selected' : ''}>⚠️ Negative</option>
          `;
          
          valenceRow.appendChild(valenceLabel);
          valenceRow.appendChild(valenceSelect);

          row.appendChild(topRow);
          row.appendChild(desc);
          row.appendChild(valenceRow);
          eventsArea.appendChild(row);

          // Store event data
          const eventData = { 
            checkbox: cb, 
            eventType: ev.eventType, 
            description: ev.description,
            valence: ev.valence,
            emoji: initialEmoji,
            emojiBtn,
            valenceSelect
          };
          eventCheckboxes.push(eventData);

          // Emoji picker on click
          emojiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a temporary modal for emoji picker
            const pickerOverlay = document.createElement('div');
            pickerOverlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';
            
            const pickerCard = document.createElement('div');
            pickerCard.style.cssText = 'background:var(--bg);border-radius:12px;padding:16px;max-width:300px;width:100%;';
            
            const pickerTitle = document.createElement('div');
            pickerTitle.textContent = 'Choose Emoji';
            pickerTitle.style.cssText = 'font-size:0.8rem;font-weight:600;margin-bottom:8px;color:var(--text);';
            pickerCard.appendChild(pickerTitle);
            
            const picker = createEmojiPicker({
              selectedEmoji: eventData.emoji,
              onSelect: (selectedEmoji: string) => {
                emojiBtn.textContent = selectedEmoji;
                eventData.emoji = selectedEmoji;
                pickerOverlay.remove();
              }
            });
            pickerCard.appendChild(picker);
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = 'width:100%;padding:8px;margin-top:8px;border:1px solid var(--border);border-radius:8px;background:var(--card);cursor:pointer;';
            closeBtn.addEventListener('click', () => pickerOverlay.remove());
            pickerCard.appendChild(closeBtn);
            
            pickerOverlay.appendChild(pickerCard);
            pickerOverlay.addEventListener('click', (e) => {
              if (e.target === pickerOverlay) pickerOverlay.remove();
            });
            document.body.appendChild(pickerOverlay);
          });
        }
      }
      saveBtn.style.opacity = '1';
      saveBtn.style.pointerEvents = 'auto';
    }).catch((err) => {
      eventsArea.innerHTML = `<div style="font-size:0.7rem;color:var(--danger);padding:4px 0;">AI extraction error: ${err instanceof Error ? err.message : 'Unknown error'}</div>`;
      addFallbackTypeSelect(eventsArea);
      saveBtn.style.opacity = '1';
      saveBtn.style.pointerEvents = 'auto';
    });
  } else {
    // No API key — use keyword fallback
    addFallbackTypeSelect(eventsArea);
  }

  saveBtn.addEventListener('click', () => {
    overlay.remove();
    const text = transcriptInput.value.trim();
    const logTimestamp = isToday ? new Date() : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000);

    // Save diary entry if checkbox is checked
    if (diaryCheckbox.checked && text) {
      const diaryEntry: import('@src/models/index.js').DiaryEntry = {
        id: crypto.randomUUID(),
        childProfileId: profileId,
        date: startOfDay,
        content: text,
        timestamp: logTimestamp,
        source: 'voice',
        createdAt: new Date(),
      };
      deps.dataStore.saveDiaryEntry(diaryEntry);
    }

    if (eventCheckboxes.length > 0) {
      // Save each checked event with custom emoji and valence
      const checked = eventCheckboxes.filter((e) => e.checkbox.checked);
      for (const ev of checked) {
        const event = deps.eventCaptureSystem.createEvent({
          childProfileId: profileId,
          eventType: ev.eventType as EventType,
          timestamp: logTimestamp,
          source: 'voice',
          notes: ev.description || text || undefined,
          transcript: text || undefined,
          customEmoji: ev.emoji !== getEventEmoji(ev.eventType as EventType) ? ev.emoji : undefined,
          valence: ev.valenceSelect?.value as 'positive' | 'neutral' | 'negative' | undefined,
        });
        deps.eventCaptureSystem.saveEvent(event);
      }
    } else {
      // Fallback: events from checkbox list
      const checkboxes = eventsArea.querySelectorAll<HTMLInputElement>('input[data-event-type]:checked');
      const selectedTypes = Array.from(checkboxes).map((cb) => cb.dataset.eventType!);

      if (selectedTypes.length === 0 && !diaryCheckbox.checked) {
        // Nothing selected — default to mood
        selectedTypes.push('mood');
      }

      for (const eventType of selectedTypes) {
        const event = deps.eventCaptureSystem.createEvent({
          childProfileId: profileId,
          eventType: eventType as EventType,
          timestamp: logTimestamp,
          source: 'voice',
          notes: text || undefined,
          transcript: text || undefined,
        });
        deps.eventCaptureSystem.saveEvent(event);
      }
    }

    deps.onDataChange?.();
    renderTodayForDate(container, deps, profileId, selectedDate);
  });

  function addFallbackTypeSelect(area: HTMLElement): void {
    const label = document.createElement('div');
    label.textContent = 'Select event type(s):';
    label.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;';
    area.appendChild(label);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'max-height:140px;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    listContainer.className = 'fallback-type-list';

    const buttons = deps.quickTapLogger.getButtons(profileId);
    for (const btn of buttons) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer;font-size:0.68rem;color:var(--text);';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = btn.eventType;
      cb.dataset.eventType = btn.eventType;
      cb.style.cssText = 'flex-shrink:0;';

      const text = document.createElement('span');
      text.textContent = `${getQuickTapEmoji(btn.eventType)} ${btn.label}`;

      row.appendChild(cb);
      row.appendChild(text);
      listContainer.appendChild(row);
    }
    area.appendChild(listContainer);
  }
}

/**
 * Shows a modal to edit a diary entry.
 */
function showDiaryEditModal(
  container: HTMLElement,
  entry: import('@src/models/index.js').DiaryEntry,
  onSave: (content: string) => void
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);';

  const title = document.createElement('div');
  title.textContent = '✏️ Edit Diary Entry';
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:8px;';
  card.appendChild(title);

  const timestamp = document.createElement('div');
  timestamp.textContent = entry.timestamp.toLocaleString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  timestamp.style.cssText = 'font-size:0.65rem;color:var(--text-muted);margin-bottom:10px;';
  card.appendChild(timestamp);

  const textarea = document.createElement('textarea');
  textarea.value = entry.content;
  textarea.placeholder = 'Write your diary entry...';
  textarea.rows = 6;
  textarea.style.cssText = 'width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-size:0.75rem;font-family:inherit;color:var(--text);background:white;resize:vertical;box-sizing:border-box;line-height:1.5;margin-bottom:10px;';
  card.appendChild(textarea);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:10px;background:var(--accent);font-size:0.72rem;font-weight:600;cursor:pointer;color:white;';
  saveBtn.addEventListener('click', () => {
    const content = textarea.value.trim();
    if (!content) {
      textarea.style.borderColor = 'var(--danger)';
      return;
    }
    overlay.remove();
    onSave(content);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);

  // Focus textarea and move cursor to end
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, 100);
}

/**
 * Shows a custom note-editing modal inside the phone frame.
 * Constrained to the phone container width with a multi-line textarea.
 */
function showNoteModal(container: HTMLElement, currentNote: string, onSave: (note: string) => void): void {
  // Find the phone frame to constrain the overlay
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);';

  const title = document.createElement('div');
  title.textContent = '✏️ Add a note';
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:8px;';
  card.appendChild(title);

  const textarea = document.createElement('textarea');
  textarea.value = currentNote;
  textarea.placeholder = 'What happened? Any context worth remembering...';
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
    onSave(textarea.value.trim());
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);

  // Append to the phone frame so it's constrained within it
  phoneFrame.appendChild(overlay);

  // Focus the textarea
  setTimeout(() => textarea.focus(), 50);
}

// ── Mood Classification ──

/** Event types that push the day toward red */
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue'];
/** Event types that push the day toward green */
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding'];

function computeAutoMood(events: Event[]): MoodColor {
  let score = 0; // positive = green, negative = red
  for (const e of events) {
    if (RED_EVENTS.includes(e.eventType)) {
      score -= (e.severity ?? 3); // default weight 3 for unrated
    } else if (GREEN_EVENTS.includes(e.eventType)) {
      score += 2;
    }
    // neutral events don't shift the score
  }
  if (events.length === 0) return 'green'; // no events = benefit of the doubt
  if (score <= -3) return 'red';
  if (score < 3) return 'amber';
  return 'green';
}

const MOOD_CONFIG: Record<MoodColor, { emoji: string; label: string; bg: string; border: string; text: string }> = {
  green: { emoji: '🟢', label: 'Good day', bg: 'rgba(76,175,80,0.10)', border: 'rgba(76,175,80,0.4)', text: '#2e7d32' },
  amber: { emoji: '🟡', label: 'Mixed day', bg: 'rgba(255,193,7,0.10)', border: 'rgba(255,193,7,0.4)', text: '#f57f17' },
  red:   { emoji: '🔴', label: 'Tough day', bg: 'rgba(244,67,54,0.10)', border: 'rgba(244,67,54,0.4)', text: '#c62828' },
};

function renderMoodStrip(
  parentEl: HTMLElement,
  deps: TodayViewDeps,
  profileId: string,
  dateKey: string,
  dayEvents: Event[],
  onMoodChange: () => void,
): void {
  const autoMood = computeAutoMood(dayEvents);

  // Load or create DayMood record
  let dayMood = deps.dataStore.getDayMood(profileId, dateKey);
  if (!dayMood) {
    dayMood = {
      id: `${profileId}:${dateKey}`,
      childProfileId: profileId,
      dateKey,
      autoMood,
      updatedAt: new Date(),
    };
    deps.dataStore.saveDayMood(dayMood);
  } else if (dayMood.autoMood !== autoMood) {
    // Refresh auto-computed mood when events change
    dayMood = { ...dayMood, autoMood, updatedAt: new Date() };
    deps.dataStore.saveDayMood(dayMood);
  }

  const activeMood = dayMood.overrideMood ?? dayMood.autoMood;
  const cfg = MOOD_CONFIG[activeMood];

  const strip = document.createElement('div');
  strip.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:8px;border-radius:12px;background:${cfg.bg};border:1px solid ${cfg.border};`;

  const label = document.createElement('span');
  label.style.cssText = `font-size:0.78rem;font-weight:600;color:${cfg.text};flex:1;`;
  label.textContent = `${cfg.emoji} ${cfg.label}`;
  if (dayMood.overrideMood) {
    label.textContent += ' (override)';
  }
  strip.appendChild(label);

  // Three color buttons for override
  const colors: MoodColor[] = ['green', 'amber', 'red'];
  for (const color of colors) {
    const btn = document.createElement('button');
    btn.textContent = MOOD_CONFIG[color].emoji;
    const isActive = activeMood === color;
    btn.style.cssText = `padding:4px 8px;border:${isActive ? '2px solid ' + MOOD_CONFIG[color].text : '1px solid var(--border)'};border-radius:8px;background:${isActive ? MOOD_CONFIG[color].bg : 'white'};font-size:0.75rem;cursor:pointer;transition:all 0.12s;`;
    btn.title = MOOD_CONFIG[color].label;
    btn.addEventListener('click', () => {
      const updated: DayMood = {
        ...dayMood!,
        overrideMood: color === dayMood!.autoMood ? undefined : color,
        updatedAt: new Date(),
      };
      deps.dataStore.saveDayMood(updated);
      deps.onDataChange?.();
      onMoodChange();
    });
    strip.appendChild(btn);
  }

  parentEl.appendChild(strip);
}

// ── Saved Custom Events Storage ──

interface SavedCustomEvent {
  label: string;
  emoji: string;
}

function getSavedCustomEvents(profileId: string): SavedCustomEvent[] {
  try {
    const raw = localStorage.getItem(`attune-saved-custom-events-${profileId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addSavedCustomEvent(profileId: string, event: SavedCustomEvent): void {
  const existing = getSavedCustomEvents(profileId);
  // Avoid duplicates by label
  if (!existing.some(e => e.label === event.label)) {
    existing.push(event);
    localStorage.setItem(`attune-saved-custom-events-${profileId}`, JSON.stringify(existing));
  }
}

function removeSavedCustomEvent(profileId: string, label: string): void {
  const existing = getSavedCustomEvents(profileId);
  const filtered = existing.filter(e => e.label !== label);
  localStorage.setItem(`attune-saved-custom-events-${profileId}`, JSON.stringify(filtered));
}

// ── Custom Event Modal ──

function showCustomEventModal(
  container: HTMLElement,
  deps: TodayViewDeps,
  profileId: string,
  selectedDate: Date,
  isToday: boolean,
  startOfDay: Date,
  onSaved: () => void,
  prefillLabel?: string,
  prefillEmoji?: string,
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:320px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);max-height:90vh;overflow-y:auto;';

  const title = document.createElement('div');
  title.textContent = '📝 Add Custom Event';
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:8px;';
  card.appendChild(title);

  // Event label with emoji preview
  const labelEl = document.createElement('div');
  labelEl.textContent = 'What happened?';
  labelEl.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
  card.appendChild(labelEl);

  const labelRow = document.createElement('div');
  labelRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';

  const emojiPreview = document.createElement('span');
  emojiPreview.textContent = prefillEmoji || '📝';
  emojiPreview.style.cssText = 'font-size:1.2rem;flex-shrink:0;';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'e.g. Therapy session, Park visit...';
  labelInput.value = prefillLabel || '';
  labelInput.style.cssText = 'flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:0.75rem;color:var(--text);background:white;box-sizing:border-box;font-family:inherit;';

  labelRow.appendChild(emojiPreview);
  labelRow.appendChild(labelInput);
  card.appendChild(labelRow);

  // Emoji picker
  let selectedEmoji: string | undefined = prefillEmoji || undefined;

  const emojiLabel = document.createElement('div');
  emojiLabel.textContent = 'Choose an emoji';
  emojiLabel.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
  card.appendChild(emojiLabel);

  const emojiPicker = createEmojiPicker({
    onSelect: (emoji) => {
      selectedEmoji = emoji || undefined;
      emojiPreview.textContent = emoji || '📝';
    },
    selectedEmoji,
  });
  card.appendChild(emojiPicker);

  // Valence selector
  let selectedValence: 'positive' | 'neutral' | 'negative' = 'neutral';

  const valenceLabel = document.createElement('div');
  valenceLabel.textContent = 'Impact on wellbeing';
  valenceLabel.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;margin-bottom:6px;';
  card.appendChild(valenceLabel);

  const valenceRow = document.createElement('div');
  valenceRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';

  const valenceOptions: Array<{ value: 'positive' | 'neutral' | 'negative'; label: string; emoji: string; color: string }> = [
    { value: 'positive', label: 'Positive', emoji: '✅', color: '#4caf50' },
    { value: 'neutral', label: 'Neutral', emoji: '➖', color: '#9e9e9e' },
    { value: 'negative', label: 'Negative', emoji: '⚠️', color: '#f44336' },
  ];

  for (const option of valenceOptions) {
    const btn = document.createElement('button');
    btn.textContent = `${option.emoji} ${option.label}`;
    btn.style.cssText = `flex:1;padding:8px 6px;border:2px solid ${option.value === 'neutral' ? option.color : 'var(--border)'};border-radius:8px;background:${option.value === 'neutral' ? 'rgba(158,158,158,0.1)' : 'white'};font-size:0.68rem;cursor:pointer;color:var(--text);font-weight:${option.value === 'neutral' ? '600' : '500'};transition:all 0.15s;`;
    
    btn.addEventListener('click', () => {
      selectedValence = option.value;
      // Update all buttons
      valenceRow.querySelectorAll('button').forEach((b, i) => {
        const opt = valenceOptions[i];
        const isSelected = opt.value === selectedValence;
        b.style.borderColor = isSelected ? opt.color : 'var(--border)';
        b.style.background = isSelected ? `${opt.color}15` : 'white';
        b.style.fontWeight = isSelected ? '600' : '500';
      });
    });

    valenceRow.appendChild(btn);
  }

  card.appendChild(valenceRow);

  // Save for quick access toggle
  const saveToggleRow = document.createElement('label');
  saveToggleRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;cursor:pointer;';

  const saveCheckbox = document.createElement('input');
  saveCheckbox.type = 'checkbox';
  saveCheckbox.style.cssText = 'width:16px;height:16px;accent-color:var(--accent);cursor:pointer;';

  const saveToggleLabel = document.createElement('span');
  saveToggleLabel.textContent = 'Save for quick access';
  saveToggleLabel.style.cssText = 'font-size:0.7rem;color:var(--text);';

  saveToggleRow.appendChild(saveCheckbox);
  saveToggleRow.appendChild(saveToggleLabel);
  card.appendChild(saveToggleRow);

  // Optional notes
  const notesLabel = document.createElement('div');
  notesLabel.textContent = 'Notes (optional)';
  notesLabel.style.cssText = 'font-size:0.62rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
  card.appendChild(notesLabel);

  const notesInput = document.createElement('textarea');
  notesInput.placeholder = 'Any details worth remembering...';
  notesInput.rows = 2;
  notesInput.style.cssText = 'width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:0.72rem;font-family:inherit;color:var(--text);background:white;resize:vertical;box-sizing:border-box;line-height:1.4;';
  card.appendChild(notesInput);

  // Buttons
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
    const customLabel = labelInput.value.trim();
    if (!customLabel) {
      labelInput.style.borderColor = 'var(--danger)';
      return;
    }
    overlay.remove();
    const logTimestamp = isToday ? new Date() : new Date(startOfDay.getTime() + 12 * 60 * 60 * 1000);
    const event = deps.eventCaptureSystem.createEvent({
      childProfileId: profileId,
      eventType: 'custom',
      timestamp: logTimestamp,
      source: 'custom',
      customLabel,
      customEmoji: selectedEmoji || undefined,
      notes: notesInput.value.trim() || undefined,
      valence: selectedValence,
    });
    deps.eventCaptureSystem.saveEvent(event);

    // Save for quick access if checked
    if (saveCheckbox.checked) {
      addSavedCustomEvent(profileId, { label: customLabel, emoji: selectedEmoji || '📝' });
    }

    deps.onDataChange?.();
    onSaved();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);
  setTimeout(() => labelInput.focus(), 50);
}
