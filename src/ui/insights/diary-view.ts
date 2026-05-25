/**
 * Diary View - Centralized view of all diary entries
 * Shows diary entries chronologically with date headers
 */

import type { DataStore } from '@src/data-store/data-store.js';
import type { DiaryEntry } from '@src/models/index.js';

export interface DiaryViewDeps {
  dataStore: DataStore;
  onDataChange?: () => void;
}

export function renderDiaryView(
  container: HTMLElement,
  deps: DiaryViewDeps,
  profileId: string,
): void {
  container.innerHTML = '';
  container.style.cssText = 'padding:12px;overflow-y:auto;height:100%;';

  // Get all diary entries for the profile
  const allEntries = deps.dataStore.getDiaryEntries(profileId);

  if (allEntries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-dim);';
    emptyState.innerHTML = `
      <div style="font-size:3rem;margin-bottom:12px;">📔</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:6px;">No Diary Entries Yet</div>
      <div style="font-size:0.72rem;line-height:1.4;">Use Voice Log and check "Save as diary entry" to capture daily narratives without affecting event tracking.</div>
    `;
    container.appendChild(emptyState);
    return;
  }

  // Group entries by date
  const entriesByDate = new Map<string, DiaryEntry[]>();
  for (const entry of allEntries) {
    const dateKey = entry.date.toISOString().split('T')[0];
    if (!entriesByDate.has(dateKey)) {
      entriesByDate.set(dateKey, []);
    }
    entriesByDate.get(dateKey)!.push(entry);
  }

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a));

  // Header with count
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--border);';
  
  const title = document.createElement('h2');
  title.textContent = `📔 Diary`;
  title.style.cssText = 'margin:0 0 4px 0;font-size:1rem;color:var(--text);';
  
  const subtitle = document.createElement('div');
  subtitle.textContent = `${allEntries.length} ${allEntries.length === 1 ? 'entry' : 'entries'} across ${sortedDates.length} ${sortedDates.length === 1 ? 'day' : 'days'}`;
  subtitle.style.cssText = 'font-size:0.7rem;color:var(--text-muted);';
  
  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Render entries grouped by date
  for (const dateKey of sortedDates) {
    const entries = entriesByDate.get(dateKey)!;
    const date = new Date(dateKey + 'T12:00:00');

    // Date header
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = 'margin:20px 0 10px 0;padding:6px 10px;background:linear-gradient(135deg, rgba(255,248,225,0.3), rgba(255,237,213,0.3));border-left:3px solid rgba(255,193,7,0.5);border-radius:4px;';
    
    const dateTitle = document.createElement('div');
    dateTitle.style.cssText = 'font-size:0.78rem;font-weight:600;color:var(--text);';
    
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      dateTitle.textContent = `Today - ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else if (isYesterday) {
      dateTitle.textContent = `Yesterday - ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else {
      dateTitle.textContent = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    const entryCount = document.createElement('span');
    entryCount.textContent = ` (${entries.length})`;
    entryCount.style.cssText = 'font-size:0.68rem;color:var(--text-muted);font-weight:normal;';
    dateTitle.appendChild(entryCount);
    
    dateHeader.appendChild(dateTitle);
    container.appendChild(dateHeader);

    // Sort entries by timestamp (most recent first)
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Render each entry
    for (const entry of entries) {
      const entryCard = document.createElement('div');
      entryCard.style.cssText = 'margin-bottom:10px;padding:12px;background:white;border:1px solid rgba(255,193,7,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);';

      // Entry header with time and delete button
      const entryHeader = document.createElement('div');
      entryHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
      
      const timeLabel = document.createElement('div');
      timeLabel.style.cssText = 'display:flex;align-items:center;gap:6px;';
      
      const timeIcon = document.createElement('span');
      timeIcon.textContent = '🕐';
      timeIcon.style.cssText = 'font-size:0.85rem;';
      
      const timeText = document.createElement('span');
      timeText.textContent = entry.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      timeText.style.cssText = 'font-size:0.7rem;color:var(--text-muted);font-weight:600;';
      
      timeLabel.appendChild(timeIcon);
      timeLabel.appendChild(timeText);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕ Delete';
      deleteBtn.style.cssText = 'padding:4px 8px;border:1px solid var(--danger);border-radius:6px;background:rgba(199,92,92,0.08);font-size:0.65rem;cursor:pointer;color:var(--danger);transition:all 0.15s;';
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = 'rgba(199,92,92,0.15)';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'rgba(199,92,92,0.08)';
      });
      deleteBtn.addEventListener('click', () => {
        showDeleteConfirmationModal(entry, () => {
          deps.dataStore.deleteDiaryEntry(entry.id);
          deps.onDataChange?.();
          renderDiaryView(container, deps, profileId);
        });
      });
      
      entryHeader.appendChild(timeLabel);
      entryHeader.appendChild(deleteBtn);
      
      // Entry content
      const entryContent = document.createElement('div');
      entryContent.textContent = entry.content;
      entryContent.style.cssText = 'font-size:0.78rem;color:var(--text);line-height:1.6;white-space:pre-wrap;';
      
      entryCard.appendChild(entryHeader);
      entryCard.appendChild(entryContent);
      container.appendChild(entryCard);
    }
  }
}

/**
 * Show a custom confirmation modal for deleting a diary entry
 * with a preview of the content being deleted
 */
function showDeleteConfirmationModal(entry: DiaryEntry, onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg);border-radius:16px;padding:20px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);border:1px solid var(--border);';

  // Warning icon and title
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;margin-bottom:16px;';
  
  const icon = document.createElement('div');
  icon.textContent = '⚠️';
  icon.style.cssText = 'font-size:3rem;margin-bottom:8px;';
  
  const title = document.createElement('div');
  title.textContent = 'Delete Diary Entry?';
  title.style.cssText = 'font-size:1rem;font-weight:600;color:var(--text);margin-bottom:4px;';
  
  const subtitle = document.createElement('div');
  subtitle.textContent = 'This action cannot be undone';
  subtitle.style.cssText = 'font-size:0.75rem;color:var(--text-muted);';
  
  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);
  modal.appendChild(header);

  // Entry preview
  const preview = document.createElement('div');
  preview.style.cssText = 'background:rgba(255,248,225,0.3);border:1px solid rgba(255,193,7,0.3);border-radius:8px;padding:12px;margin-bottom:16px;max-height:150px;overflow-y:auto;';
  
  const previewDate = document.createElement('div');
  previewDate.textContent = `${entry.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${entry.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  previewDate.style.cssText = 'font-size:0.7rem;color:var(--text-muted);font-weight:600;margin-bottom:6px;';
  
  const previewContent = document.createElement('div');
  const contentPreview = entry.content.length > 150 
    ? entry.content.substring(0, 150) + '...' 
    : entry.content;
  previewContent.textContent = contentPreview;
  previewContent.style.cssText = 'font-size:0.72rem;color:var(--text);line-height:1.4;';
  
  preview.appendChild(previewDate);
  preview.appendChild(previewContent);
  modal.appendChild(preview);

  // Buttons
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--card);font-size:0.8rem;font-weight:600;cursor:pointer;color:var(--text);transition:all 0.15s;';
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'var(--border)';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'var(--card)';
  });
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete Entry';
  deleteBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:var(--danger);font-size:0.8rem;font-weight:600;cursor:pointer;color:white;transition:all 0.15s;';
  deleteBtn.addEventListener('mouseenter', () => {
    deleteBtn.style.background = '#d32f2f';
  });
  deleteBtn.addEventListener('mouseleave', () => {
    deleteBtn.style.background = 'var(--danger)';
  });
  deleteBtn.addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });

  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(deleteBtn);
  modal.appendChild(buttonRow);

  overlay.appendChild(modal);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  document.body.appendChild(overlay);
}
