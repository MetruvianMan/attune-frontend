import type { DataStore } from '@src/data-store/data-store.js';
import type { DocumentArchive } from '@src/document-archive/document-archive.js';
import type { ArchivedDocument, DocumentType, DocumentFilter } from '@src/models/index.js';
import { createHeaderWithPhoto } from './header-with-photo.js';

export interface DocumentArchiveViewDeps {
  dataStore: DataStore;
  documentArchive: DocumentArchive;
  activeChildProfileId: () => string | null;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'evaluation', 'iep', 'provider_report', 'therapy_notes', 'medical_record', 'other',
];

/**
 * Render the Document Archive View into the given container.
 * Shows file upload, metadata form, document list with sorting/filtering, and delete.
 */
export function renderDocumentArchiveView(container: HTMLElement, deps: DocumentArchiveViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">📄</span>Documents</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  container.appendChild(createHeaderWithPhoto('📄', 'Documents', profileId));

  // Upload area — progressive disclosure
  const uploadCard = document.createElement('div');
  uploadCard.className = 'soft-card';

  // Mode selector: Upload File or Paste Text
  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';

  const uploadModeBtn = document.createElement('button');
  uploadModeBtn.textContent = '📁 Upload File';
  uploadModeBtn.style.cssText = 'flex:1;padding:10px;border:2px solid var(--accent);border-radius:var(--radius-btn);background:var(--accent-light);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--accent);transition:all 0.15s;';

  const pasteModeBtn = document.createElement('button');
  pasteModeBtn.textContent = '📋 Paste Text';
  pasteModeBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--card);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--text-dim);transition:all 0.15s;';

  let mode: 'file' | 'paste' = 'file';

  modeRow.appendChild(uploadModeBtn);
  modeRow.appendChild(pasteModeBtn);
  uploadCard.appendChild(modeRow);

  // Document name (always visible)
  const nameLabel = document.createElement('div');
  nameLabel.textContent = 'Document Name (optional)';
  nameLabel.style.cssText = 'font-size:0.62rem;font-weight:700;color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;';
  uploadCard.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., Neuropsych Evaluation 2024 (defaults to file name)';
  nameInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:10px;background:white;color:var(--text);box-sizing:border-box;';
  uploadCard.appendChild(nameInput);

  // File input area
  const fileArea = document.createElement('div');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx';
  fileInput.style.cssText = 'width:100%;padding:10px;border:2px dashed var(--border);border-radius:var(--radius-input);font-size:0.68rem;margin-bottom:10px;background:var(--bg);color:var(--text);box-sizing:border-box;';
  fileArea.appendChild(fileInput);
  uploadCard.appendChild(fileArea);

  // Paste text area
  const pasteArea = document.createElement('div');
  pasteArea.style.cssText = 'display:none;';
  const pasteTextarea = document.createElement('textarea');
  pasteTextarea.placeholder = 'Paste full document text here...';
  pasteTextarea.style.cssText = 'width:100%;min-height:80px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.7rem;font-family:inherit;color:var(--text);background:white;resize:vertical;box-sizing:border-box;line-height:1.4;margin-bottom:10px;';
  pasteTextarea.rows = 4;
  pasteArea.appendChild(pasteTextarea);
  uploadCard.appendChild(pasteArea);

  // Mode toggle logic
  const setMode = (m: 'file' | 'paste'): void => {
    mode = m;
    if (m === 'file') {
      uploadModeBtn.style.cssText = 'flex:1;padding:10px;border:2px solid var(--accent);border-radius:var(--radius-btn);background:var(--accent-light);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--accent);transition:all 0.15s;';
      pasteModeBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--card);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--text-dim);transition:all 0.15s;';
      fileArea.style.display = 'block';
      pasteArea.style.display = 'none';
    } else {
      pasteModeBtn.style.cssText = 'flex:1;padding:10px;border:2px solid var(--accent);border-radius:var(--radius-btn);background:var(--accent-light);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--accent);transition:all 0.15s;';
      uploadModeBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--card);font-size:0.72rem;font-weight:600;cursor:pointer;color:var(--text-dim);transition:all 0.15s;';
      fileArea.style.display = 'none';
      pasteArea.style.display = 'block';
    }
  };
  uploadModeBtn.addEventListener('click', () => setMode('file'));
  pasteModeBtn.addEventListener('click', () => setMode('paste'));

  // Optional details — collapsible
  const detailsToggle = document.createElement('button');
  detailsToggle.textContent = '⚙️ Details (type, provider, date)';
  detailsToggle.style.cssText = 'border:none;background:none;font-size:0.65rem;color:var(--text-muted);cursor:pointer;padding:4px 0;margin-bottom:6px;text-align:left;';

  const detailsContent = document.createElement('div');
  detailsContent.style.cssText = 'display:none;';

  detailsToggle.addEventListener('click', () => {
    const isHidden = detailsContent.style.display === 'none';
    detailsContent.style.display = isHidden ? 'block' : 'none';
    detailsToggle.textContent = isHidden ? '⚙️ Hide details' : '⚙️ Details (type, provider, date)';
  });

  uploadCard.appendChild(detailsToggle);

  // Document type
  const typeSelect = document.createElement('select');
  typeSelect.style.cssText = 'width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:8px;background:white;color:var(--text);';
  for (const t of DOCUMENT_TYPES) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = formatDocType(t);
    typeSelect.appendChild(opt);
  }
  detailsContent.appendChild(typeSelect);

  // Source provider
  const providerInput = document.createElement('input');
  providerInput.type = 'text';
  providerInput.placeholder = 'Source provider (e.g., Dr. Smith)';
  providerInput.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:8px;background:white;color:var(--text);box-sizing:border-box;';
  detailsContent.appendChild(providerInput);

  // Document date
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.style.cssText = 'width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;margin-bottom:8px;color:var(--text);';
  detailsContent.appendChild(dateInput);

  uploadCard.appendChild(detailsContent);

  // Upload button — gradient CTA
  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = '📤 Save Document';
  uploadBtn.className = 'btn-primary';
  uploadBtn.style.cssText += 'margin-top:6px;';
  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    const pastedText = pasteTextarea.value.trim();
    const docName = nameInput.value.trim() || file?.name || 'Untitled Document';

    if (mode === 'file' && !file) {
      alert('Please select a file.');
      return;
    }
    if (mode === 'paste' && !pastedText) {
      alert('Please paste document text.');
      return;
    }

    uploadBtn.textContent = 'Saving...';
    uploadBtn.style.opacity = '0.6';

    try {
      if (mode === 'paste' && pastedText) {
        const doc: ArchivedDocument = {
          id: crypto.randomUUID(),
          childProfileId: profileId,
          documentType: typeSelect.value as DocumentType,
          sourceProvider: providerInput.value.trim() || undefined,
          documentDate: dateInput.value ? new Date(dateInput.value) : undefined,
          fileReference: docName,
          extractedText: pastedText,
          extractionFailed: false,
          uploadedAt: new Date(),
        };
        deps.dataStore.saveArchivedDocument(doc);
      } else if (file) {
        await deps.documentArchive.uploadDocument(
          file,
          {
            documentType: typeSelect.value as DocumentType,
            sourceProvider: providerInput.value.trim() || undefined,
            documentDate: dateInput.value ? new Date(dateInput.value) : undefined,
            fileReference: docName,
          },
          profileId,
        );
      }
    } catch {
      // Upload failed — will still re-render
    }

    renderDocumentArchiveView(container, deps);
  });
  uploadCard.appendChild(uploadBtn);
  container.appendChild(uploadCard);

  // Filter controls
  const filterCard = document.createElement('div');
  filterCard.className = 'soft-card';

  const browseHeader = document.createElement('h2');
  browseHeader.textContent = 'Your Documents';
  filterCard.appendChild(browseHeader);

  const filterRow = document.createElement('div');
  filterRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';

  const filterTypeSelect = document.createElement('select');
  filterTypeSelect.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.68rem;background:white;color:var(--text);';
  filterTypeSelect.innerHTML = '<option value="">All types</option>';
  for (const t of DOCUMENT_TYPES) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = formatDocType(t);
    filterTypeSelect.appendChild(opt);
  }

  const sortSelect = document.createElement('select');
  sortSelect.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.68rem;background:white;color:var(--text);';
  sortSelect.innerHTML = `
    <option value="upload_date-desc">Newest first</option>
    <option value="upload_date-asc">Oldest first</option>
    <option value="date-desc">Doc date ↓</option>
    <option value="date-asc">Doc date ↑</option>`;

  filterRow.appendChild(filterTypeSelect);
  filterRow.appendChild(sortSelect);
  filterCard.appendChild(filterRow);

  // Document list
  const docListContainer = document.createElement('div');

  const refreshDocList = (): void => {
    docListContainer.innerHTML = '';
    const [sortBy, sortOrder] = sortSelect.value.split('-') as [DocumentFilter['sortBy'], DocumentFilter['sortOrder']];
    const filter: DocumentFilter = {
      documentType: filterTypeSelect.value ? (filterTypeSelect.value as DocumentType) : undefined,
      sortBy: sortBy as 'date' | 'upload_date',
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const docs = deps.documentArchive.getDocuments(profileId, filter);

    if (docs.length === 0) {
      docListContainer.innerHTML = '<div style="text-align:center;padding:16px;font-size:0.72rem;color:var(--text-muted);">No documents found.</div>';
      return;
    }

    for (const doc of docs) {
      const docEl = document.createElement('div');
      docEl.style.cssText = 'background:var(--bg);border-radius:var(--radius-card);padding:12px 14px;margin-bottom:10px;border:1px solid var(--border);';

      let docInfo = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.75rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.fileReference}</div>
            <div style="font-size:0.6rem;color:var(--text-muted);margin-top:2px;">
              ${formatDocType(doc.documentType)}
              ${doc.sourceProvider ? ` · ${doc.sourceProvider}` : ''}
              ${doc.documentDate ? ` · ${doc.documentDate.toLocaleDateString()}` : ''}
            </div>`;

      if (doc.extractionFailed) {
        docInfo += '<div style="font-size:0.58rem;color:var(--warn);margin-top:3px;">⚠️ Text extraction failed</div>';
      } else if (doc.extractedText) {
        const charCount = doc.extractedText.length;
        const label = charCount > 1000 ? `${Math.round(charCount / 1000)}k chars` : `${charCount} chars`;
        docInfo += `<div style="font-size:0.58rem;color:var(--sage);margin-top:3px;">✓ ${label} indexed</div>`;
      }

      docInfo += '</div></div>';

      const deleteDocBtn = document.createElement('button');
      deleteDocBtn.textContent = '🗑️';
      deleteDocBtn.style.cssText = 'padding:6px 10px;border:1px solid var(--danger);border-radius:var(--radius-input);background:rgba(235,87,87,0.06);font-size:0.65rem;cursor:pointer;';
      deleteDocBtn.addEventListener('click', () => {
        // Show confirmation dialog
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;border-radius:var(--radius-card);padding:20px;max-width:260px;width:90%;text-align:center;box-shadow:var(--shadow-elevated);';
        dialog.innerHTML = `
          <div style="font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:6px;">Delete this document?</div>
          <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">${doc.fileReference}</div>
          <div style="font-size:0.68rem;font-weight:700;color:var(--danger);margin-bottom:14px;">⚠️ This action cannot be undone.</div>
        `;

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';

        const keepBtn = document.createElement('button');
        keepBtn.textContent = 'Keep';
        keepBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
        keepBtn.addEventListener('click', () => overlay.remove());

        const confirmDeleteBtn = document.createElement('button');
        confirmDeleteBtn.textContent = 'Delete';
        confirmDeleteBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:var(--radius-btn);background:var(--danger);color:white;font-size:0.72rem;font-weight:600;cursor:pointer;';
        confirmDeleteBtn.addEventListener('click', () => {
          overlay.remove();
          deps.documentArchive.deleteDocument(doc.id);
          refreshDocList();
        });

        btnRow.appendChild(keepBtn);
        btnRow.appendChild(confirmDeleteBtn);
        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
      });

      // Action row
      const actionRow = document.createElement('div');
      actionRow.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);';

      // Edit name button — low visual weight, same as Timeline pencils
      const editNameBtn = document.createElement('button');
      editNameBtn.textContent = '✏️';
      editNameBtn.style.cssText = 'padding:3px 6px;border:none;background:none;font-size:0.6rem;cursor:pointer;opacity:0.4;transition:opacity 0.15s;';
      editNameBtn.addEventListener('mouseenter', () => { editNameBtn.style.opacity = '0.8'; });
      editNameBtn.addEventListener('mouseleave', () => { editNameBtn.style.opacity = '0.4'; });
      editNameBtn.addEventListener('click', () => {
        // Show rename modal
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;border-radius:var(--radius-card);padding:20px;max-width:280px;width:90%;box-shadow:var(--shadow-elevated);';

        const titleEl = document.createElement('div');
        titleEl.textContent = '✏️ Rename document';
        titleEl.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:10px;';
        dialog.appendChild(titleEl);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = doc.fileReference;
        input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.72rem;background:white;color:var(--text);box-sizing:border-box;margin-bottom:12px;';
        dialog.appendChild(input);

        const btnRow2 = document.createElement('div');
        btnRow2.style.cssText = 'display:flex;gap:8px;';

        const cancelRenameBtn = document.createElement('button');
        cancelRenameBtn.textContent = 'Cancel';
        cancelRenameBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--card);font-size:0.72rem;cursor:pointer;color:var(--text);';
        cancelRenameBtn.addEventListener('click', () => overlay.remove());

        const saveRenameBtn = document.createElement('button');
        saveRenameBtn.textContent = 'Save';
        saveRenameBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:var(--radius-btn);background:var(--accent);color:white;font-size:0.72rem;font-weight:600;cursor:pointer;';
        saveRenameBtn.addEventListener('click', () => {
          const newName = input.value.trim();
          if (newName && newName !== doc.fileReference) {
            const updated = { ...doc, fileReference: newName };
            deps.dataStore.saveArchivedDocument(updated);
          }
          overlay.remove();
          refreshDocList();
        });

        btnRow2.appendChild(cancelRenameBtn);
        btnRow2.appendChild(saveRenameBtn);
        dialog.appendChild(btnRow2);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        setTimeout(() => { input.focus(); input.select(); }, 50);
      });

      actionRow.appendChild(editNameBtn);
      actionRow.appendChild(deleteDocBtn);

      const leftDiv = document.createElement('div');
      leftDiv.innerHTML = docInfo;

      docEl.appendChild(leftDiv);
      docEl.appendChild(actionRow);
      docListContainer.appendChild(docEl);
    }
  };

  filterTypeSelect.addEventListener('change', refreshDocList);
  sortSelect.addEventListener('change', refreshDocList);

  filterCard.appendChild(docListContainer);
  container.appendChild(filterCard);

  // Initial render of doc list
  refreshDocList();
}

function formatDocType(type: DocumentType): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
