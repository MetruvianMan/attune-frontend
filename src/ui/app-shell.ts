import { InMemoryDataStore } from '@src/data-store/in-memory-data-store.js';
import { EventCaptureSystemImpl } from '@src/event-capture/event-capture-system.js';
import { QuickTapLoggerImpl } from '@src/event-capture/quick-tap-logger.js';
import { ContextEngineImpl } from '@src/context-engine/context-engine.js';
import { ConversationSessionManagerImpl } from '@src/conversation/conversation-session-manager.js';
import { InsightEngineImpl } from '@src/insight-engine/insight-engine.js';
import { DocumentArchiveImpl } from '@src/document-archive/document-archive.js';
import { NLPPipelineImpl } from '@src/nlp-pipeline/nlp-pipeline.js';
import { MockLLMProvider } from '@src/llm/mock-llm-provider.js';
import { createToneComplianceFilter } from '@src/tone-compliance/tone-compliance-filter.js';
import { GLOSSARY_SEED_DATA } from '@src/glossary/glossary-data.js';
import { PersonResolutionServiceImpl } from '@src/person-resolution/person-resolution-service.js';

import { renderTodayView } from './today-view.js';
import { renderInsightsView } from './insights-view.js';
import { renderConversationView } from './conversation-view.js';
import { renderProfileView } from './profile-management-view.js';
import { renderDocumentArchiveView } from './document-archive-view.js';
import { renderGlossaryView } from './glossary-view.js';
import { renderRelationshipsView } from './relationships-view.js';

/**
 * Initialize all subsystems and render all views into the phone frame.
 * Wires tab navigation to show/hide views and profile switching to refresh all views.
 */
export async function initAppShell(): Promise<void> {
  try {
    // Initialize core subsystems
    const dataStore = new InMemoryDataStore();
    const llmProvider = new MockLLMProvider();
    const nlpPipeline = new NLPPipelineImpl(llmProvider);
    const toneFilter = createToneComplianceFilter();

    // Seed glossary terms (always — these are static reference data)
    dataStore.seedGlossaryTerms(GLOSSARY_SEED_DATA);

    // Initialize IndexedDB before loading data
    await dataStore.initialize();

    // Load persisted data from IndexedDB (with automatic migration from localStorage)
    const hadPersistedData = await dataStore.loadFromLocalStorage();

  const eventCaptureSystem = new EventCaptureSystemImpl(dataStore, new PersonResolutionServiceImpl(dataStore));
  const quickTapLogger = new QuickTapLoggerImpl(dataStore, eventCaptureSystem);
  const contextEngine = new ContextEngineImpl(dataStore);
  const conversationSessionManager = new ConversationSessionManagerImpl(dataStore);
  const insightEngine = new InsightEngineImpl(dataStore, nlpPipeline, toneFilter);
  const documentArchive = new DocumentArchiveImpl(dataStore, nlpPipeline);

  // Active profile state — restore from persisted data if available
  let activeChildProfileId: string | null = null;
  if (hadPersistedData) {
    const profiles = dataStore.listChildProfiles();
    if (profiles.length > 0) {
      // Restore the previously active profile from localStorage
      const savedActiveId = localStorage.getItem('attune-active-profile-id');
      if (savedActiveId && profiles.some((p) => p.id === savedActiveId)) {
        activeChildProfileId = savedActiveId;
      } else {
        activeChildProfileId = profiles[0].id;
      }
    }
  }

  const getActiveProfileId = (): string | null => activeChildProfileId;
  const setActiveProfileId = (id: string | null): void => {
    activeChildProfileId = id;
    if (id) {
      localStorage.setItem('attune-active-profile-id', id);
    } else {
      localStorage.removeItem('attune-active-profile-id');
    }
  };

  /** Save state to IndexedDB after any data change. */
  function persistState(): void {
    // Fire and forget - don't block UI
    dataStore.persistToLocalStorage().catch((e) => {
      console.error('[APP] Failed to persist state:', e);
    });
  }

  // Render all views
  function renderAllViews(): void {
    const todayContainer = document.getElementById('page-today');
    const insightsContainer = document.getElementById('page-insights');
    const chatContainer = document.getElementById('page-chat');
    const documentsContainer = document.getElementById('page-documents');
    const glossaryContainer = document.getElementById('page-glossary');
    const profileContainer = document.getElementById('page-profile');

    if (todayContainer) {
      renderTodayView(todayContainer, {
        dataStore,
        eventCaptureSystem,
        quickTapLogger,
        contextEngine,
        activeChildProfileId: getActiveProfileId,
        onDataChange: persistState,
      });
    }

    if (insightsContainer) {
      renderInsightsView(insightsContainer, {
        dataStore,
        eventCaptureSystem,
        contextEngine,
        activeChildProfileId: getActiveProfileId,
        onDataChange: persistState,
        onNavigateToDate: (date: Date) => {
          // Switch to Today tab
          switchToTab('page-today');
          
          // Set the date in the Today view
          if (todayContainer) {
            // Find the date input and set it
            const dateInput = todayContainer.querySelector<HTMLInputElement>('input[type="date"]');
            if (dateInput) {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              dateInput.value = dateStr;
              // Trigger change event to update the view
              dateInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        },
      });
    }

    if (chatContainer) {
      renderConversationView(chatContainer, {
        insightEngine,
        conversationSessionManager,
        dataStore,
        activeChildProfileId: getActiveProfileId,
      });
    }

    if (documentsContainer) {
      renderDocumentArchiveView(documentsContainer, {
        dataStore,
        documentArchive,
        activeChildProfileId: getActiveProfileId,
      });
    }

    if (glossaryContainer) {
      renderGlossaryView(glossaryContainer, { dataStore, activeChildProfileId: getActiveProfileId });
    }

    const relationshipsContainer = document.getElementById('page-relationships');
    if (relationshipsContainer) {
      renderRelationshipsView(relationshipsContainer, {
        dataStore,
        activeChildProfileId: getActiveProfileId,
        onDataChange: persistState,
      });
    }

    if (profileContainer) {
      renderProfileView(profileContainer, {
        dataStore,
        activeChildProfileId: getActiveProfileId,
        setActiveChildProfileId: setActiveProfileId,
        onProfileChange: renderAllViews,
      });
    }

    // Auto-save all data to localStorage after every render cycle
    persistState();
  }

  // Helper function to switch tabs programmatically
  function switchToTab(targetId: string): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const tabPages = document.querySelectorAll<HTMLDivElement>('.tab-page');

    tabButtons.forEach((btn) => {
      if (btn.dataset.tab === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPages.forEach((page) => {
      if (page.id === targetId) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
  }

  // Wire tab navigation
  initTabNavigation(renderAllViews);

  // Initial render
  renderAllViews();
  } catch (error) {
    console.error('[APP] Fatal error during initialization:', error);
    throw error; // Re-throw to be caught by app.ts error handler
  }
}

/**
 * Set up tab button click handlers to switch between tab pages.
 * Also re-renders the target view on tab switch for fresh data.
 */
function initTabNavigation(onTabSwitch: () => void): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const tabPages = document.querySelectorAll<HTMLDivElement>('.tab-page');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      if (!targetId) return;

      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPages.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        targetPage.classList.add('active');
      }

      // Re-render all views on tab switch to pick up fresh data
      onTabSwitch();
    });
  });
}
