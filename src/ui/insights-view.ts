import type { DataStore } from '@src/data-store/data-store.js';
import type { EventCaptureSystem } from '@src/event-capture/event-capture-system.js';
import type { ContextEngine } from '@src/context-engine/context-engine.js';
import { createHeaderWithPhoto } from './header-with-photo.js';
import { renderWeatherView } from './insights/weather-view.js';
import { renderHeatmapView } from './insights/heatmap-view.js';
import { renderTrendsView } from './insights/trends-view.js';
import { renderPatternsView } from './insights/patterns-view.js';
import { renderTimelineView } from './timeline-view.js';
import { renderDiaryView } from './insights/diary-view.js';

export interface InsightsViewDeps {
  dataStore: DataStore;
  eventCaptureSystem: EventCaptureSystem;
  contextEngine: ContextEngine;
  activeChildProfileId: () => string | null;
  onDataChange?: () => void;
  onNavigateToDate?: (date: Date) => void;
}

interface SubTab {
  id: string;
  label: string;
  emoji: string;
  render: (container: HTMLElement, deps: InsightsViewDeps) => void;
}

const SUB_TABS: SubTab[] = [
  { id: 'weather', label: 'Weather', emoji: '⛅', render: renderWeatherView },
  { id: 'heatmap', label: 'Heat Map', emoji: '🗓️', render: renderHeatmapView },
  {
    id: 'diary', label: 'Diary', emoji: '📔',
    render: (container, deps) => {
      const profileId = deps.activeChildProfileId();
      if (!profileId) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);">No profile selected</div>';
        return;
      }
      renderDiaryView(container, {
        dataStore: deps.dataStore,
        onDataChange: () => {
          deps.onDataChange?.(); // Persist to localStorage
          // Re-render the diary view after changes
          renderDiaryView(container, {
            dataStore: deps.dataStore,
            onDataChange: deps.onDataChange,
          }, profileId);
        },
      }, profileId);
    },
  },
  {
    id: 'events', label: 'Events', emoji: '📋',
    render: (container, deps) => {
      // Sort toggle state
      let sortMode: 'chronological' | 'chronological-asc' | 'logged' = 'chronological-asc';

      function renderEventsContent(): void {
        container.innerHTML = '';

        // Sort toggle
        const toggleRow = document.createElement('div');
        toggleRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;';

        const toggleLabel = document.createElement('span');
        toggleLabel.style.cssText = 'font-size:0.6rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;';
        toggleLabel.textContent = 'Sort:';
        toggleRow.appendChild(toggleLabel);

        const chronoBtn = document.createElement('button');
        const isChronoActive = sortMode === 'chronological' || sortMode === 'chronological-asc';
        const arrow = sortMode === 'chronological-asc' ? ' ↑' : ' ↓';
        chronoBtn.textContent = `🕐 Day order${isChronoActive ? arrow : ''}`;
        const loggedBtn = document.createElement('button');
        loggedBtn.textContent = '📅 Logged time';

        const activePill = 'padding:4px 10px;border-radius:12px;font-size:0.62rem;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:white;';
        const inactivePill = 'padding:4px 10px;border-radius:12px;font-size:0.62rem;cursor:pointer;border:1px solid var(--border);background:var(--card);color:var(--text);';

        chronoBtn.style.cssText = isChronoActive ? activePill : inactivePill;
        loggedBtn.style.cssText = sortMode === 'logged' ? activePill : inactivePill;

        chronoBtn.addEventListener('click', () => {
          if (sortMode === 'chronological') {
            sortMode = 'chronological-asc';
          } else {
            sortMode = 'chronological';
          }
          renderEventsContent();
        });
        loggedBtn.addEventListener('click', () => { sortMode = 'logged'; renderEventsContent(); });

        toggleRow.appendChild(chronoBtn);
        toggleRow.appendChild(loggedBtn);
        container.appendChild(toggleRow);

        // Render timeline in a sub-container, then strip its header
        const timelineWrapper = document.createElement('div');
        renderTimelineView(timelineWrapper, {
          dataStore: deps.dataStore,
          eventCaptureSystem: deps.eventCaptureSystem,
          contextEngine: deps.contextEngine,
          activeChildProfileId: deps.activeChildProfileId,
          sortMode,
        });

        // Remove the first child (header with photo) to avoid duplicate
        if (timelineWrapper.firstChild) {
          timelineWrapper.removeChild(timelineWrapper.firstChild);
        }

        container.appendChild(timelineWrapper);
      }

      renderEventsContent();
    },
  },
  { id: 'trends', label: 'Trends', emoji: '📈', render: renderTrendsView },
  { id: 'patterns', label: 'Patterns', emoji: '🔍', render: renderPatternsView },
];

/**
 * Render the Insights tab with sub-tab navigation.
 * Replaces the old Timeline tab.
 */
export function renderInsightsView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">📊</span>Insights</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  // Check if profile has any events
  const events = deps.eventCaptureSystem.getEvents({ childProfileId: profileId, limit: 1 });
  if (events.length === 0) {
    container.appendChild(createHeaderWithPhoto('📊', 'Insights', profileId));
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-dim);font-size:0.78rem;line-height:1.5;';
    msg.innerHTML = `<span style="font-size:1.6rem;">✨</span><br><span style="font-weight:600;color:var(--text);">Start logging events to see patterns</span><br>Visualizations will populate as you log events on the Today tab.`;
    container.appendChild(msg);
    return;
  }

  // Header
  container.appendChild(createHeaderWithPhoto('📊', 'Insights', profileId));

  // Sub-tab navigation strip
  const tabStrip = document.createElement('div');
  tabStrip.style.cssText = 'display:flex;gap:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;margin-bottom:12px;padding-bottom:4px;scrollbar-width:none;';

  // Sub-view containers
  const subViewContainers: HTMLElement[] = [];
  const rendered = new Set<string>();

  for (let i = 0; i < SUB_TABS.length; i++) {
    const tab = SUB_TABS[i];

    // Tab pill button
    const pill = document.createElement('button');
    pill.textContent = `${tab.emoji} ${tab.label}`;
    pill.dataset.subtab = tab.id;
    pill.style.cssText = 'flex-shrink:0;padding:6px 12px;border-radius:16px;border:1px solid var(--border);font-size:0.65rem;cursor:pointer;scroll-snap-align:start;transition:all 0.12s;white-space:nowrap;';

    if (i === 0) {
      pill.style.background = 'var(--accent)';
      pill.style.color = 'white';
      pill.style.borderColor = 'var(--accent)';
    } else {
      pill.style.background = 'var(--card)';
      pill.style.color = 'var(--text)';
    }

    tabStrip.appendChild(pill);

    // Sub-view container
    const subContainer = document.createElement('div');
    subContainer.dataset.subtabContent = tab.id;
    subContainer.style.display = i === 0 ? 'block' : 'none';
    subViewContainers.push(subContainer);

    // Pill click handler
    pill.addEventListener('click', () => {
      // Update pill styles
      const pills = tabStrip.querySelectorAll<HTMLButtonElement>('button');
      pills.forEach((p) => {
        p.style.background = 'var(--card)';
        p.style.color = 'var(--text)';
        p.style.borderColor = 'var(--border)';
      });
      pill.style.background = 'var(--accent)';
      pill.style.color = 'white';
      pill.style.borderColor = 'var(--accent)';

      // Show/hide containers
      for (const sc of subViewContainers) {
        sc.style.display = sc.dataset.subtabContent === tab.id ? 'block' : 'none';
      }

      // Lazy render on first activation
      if (!rendered.has(tab.id)) {
        rendered.add(tab.id);
        tab.render(subContainer, deps);
      }
    });
  }

  container.appendChild(tabStrip);

  // Append all sub-view containers
  for (const sc of subViewContainers) {
    container.appendChild(sc);
  }

  // Render the default (first) sub-tab
  rendered.add(SUB_TABS[0].id);
  SUB_TABS[0].render(subViewContainers[0], deps);
}
