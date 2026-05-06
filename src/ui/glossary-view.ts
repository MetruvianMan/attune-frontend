import type { DataStore } from '@src/data-store/data-store.js';
import type { GlossaryCategory, GlossaryTerm } from '@src/models/index.js';
import { createHeaderWithPhoto } from './header-with-photo.js';

export interface GlossaryViewDeps {
  dataStore: DataStore;
  activeChildProfileId: () => string | null;
}

const CATEGORIES: { key: GlossaryCategory; label: string; emoji: string }[] = [
  { key: 'general_concepts', label: 'General', emoji: '🌍' },
  { key: 'autism_related', label: 'Autism', emoji: '🧩' },
  { key: 'adhd_related', label: 'ADHD', emoji: '⚡' },
  { key: 'school_and_services', label: 'School & Services', emoji: '🏫' },
  { key: 'sensory', label: 'Sensory', emoji: '🎨' },
];

/**
 * Render the Glossary View into the given container.
 * Shows terms organized by category with collapsible sections and filter tabs.
 */
export function renderGlossaryView(container: HTMLElement, deps: GlossaryViewDeps): void {
  container.innerHTML = '';

  container.appendChild(createHeaderWithPhoto('📖', 'Glossary', deps.activeChildProfileId()));

  // Category filter tabs
  let activeCategory: GlossaryCategory | null = null;

  const tabRow = document.createElement('div');
  tabRow.style.cssText = 'display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;';

  const allTab = createCategoryTab('All', '📚', true, () => {
    activeCategory = null;
    renderCategories();
  });
  tabRow.appendChild(allTab);

  const categoryTabs: HTMLButtonElement[] = [allTab];

  for (const cat of CATEGORIES) {
    const tab = createCategoryTab(cat.label, cat.emoji, false, () => {
      activeCategory = cat.key;
      renderCategories();
    });
    tabRow.appendChild(tab);
    categoryTabs.push(tab);
  }
  container.appendChild(tabRow);

  // Content area
  const contentArea = document.createElement('div');
  container.appendChild(contentArea);

  const collapsedCategories = new Set<GlossaryCategory>();

  function renderCategories(): void {
    contentArea.innerHTML = '';

    // Update tab active states
    categoryTabs[0].style.background = activeCategory === null ? 'var(--accent)' : 'var(--card)';
    categoryTabs[0].style.color = activeCategory === null ? 'white' : 'var(--text)';
    for (let i = 0; i < CATEGORIES.length; i++) {
      const isActive = activeCategory === CATEGORIES[i].key;
      categoryTabs[i + 1].style.background = isActive ? 'var(--accent)' : 'var(--card)';
      categoryTabs[i + 1].style.color = isActive ? 'white' : 'var(--text)';
    }

    const categoriesToShow = activeCategory
      ? CATEGORIES.filter((c) => c.key === activeCategory)
      : CATEGORIES;

    for (const cat of categoriesToShow) {
      const terms = deps.dataStore.getGlossaryTerms(cat.key);
      if (terms.length === 0) continue;

      const isCollapsed = collapsedCategories.has(cat.key);

      const section = document.createElement('div');
      section.className = 'soft-card';

      // Category header (clickable to collapse)
      const catHeader = document.createElement('div');
      catHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;cursor:pointer;';
      catHeader.innerHTML = `
        <span style="font-size:0.78rem;font-weight:600;color:var(--text);">${cat.emoji} ${cat.label}</span>
        <span style="font-size:0.7rem;color:var(--text-muted);">${isCollapsed ? '▸' : '▾'} ${terms.length} terms</span>`;
      catHeader.addEventListener('click', () => {
        if (collapsedCategories.has(cat.key)) {
          collapsedCategories.delete(cat.key);
        } else {
          collapsedCategories.add(cat.key);
        }
        renderCategories();
      });
      section.appendChild(catHeader);

      // Terms list
      if (!isCollapsed) {
        const termsList = document.createElement('div');
        termsList.style.cssText = 'margin-top:10px;';

        for (const term of terms) {
          const termEl = document.createElement('div');
          termEl.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);';
          termEl.innerHTML = `
            <div style="font-size:0.75rem;font-weight:600;color:var(--accent);">${term.term}</div>
            <div style="font-size:0.7rem;color:var(--text);line-height:1.5;margin-top:2px;">${term.definition}</div>`;
          termsList.appendChild(termEl);
        }

        // Remove border from last term
        const lastTerm = termsList.lastElementChild as HTMLElement | null;
        if (lastTerm) {
          lastTerm.style.borderBottom = 'none';
        }

        section.appendChild(termsList);
      }

      contentArea.appendChild(section);
    }

    if (contentArea.children.length === 0) {
      contentArea.innerHTML = `
        <div class="placeholder">
          <span class="placeholder-icon">📖</span>
          <div class="placeholder-title">No glossary terms</div>
          Glossary terms will appear here once loaded.
        </div>`;
    }
  }

  renderCategories();
}

function createCategoryTab(
  label: string,
  emoji: string,
  isActive: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = `${emoji} ${label}`;
  btn.style.cssText = `padding:6px 10px;border:1px solid var(--border);border-radius:10px;font-size:0.62rem;cursor:pointer;background:${isActive ? 'var(--accent)' : 'var(--card)'};color:${isActive ? 'white' : 'var(--text)'};`;
  btn.addEventListener('click', onClick);
  return btn;
}
