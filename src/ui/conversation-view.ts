import type { InsightEngine, ConversationResponse } from '@src/insight-engine/insight-engine.js';
import type { ConversationSessionManager } from '@src/conversation/conversation-session-manager.js';
import type { ConversationTurn } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';
import { createHeaderWithPhoto } from './header-with-photo.js';
import { getOpenAIKey } from '@src/llm/browser-openai.js';

export interface ConversationViewDeps {
  insightEngine: InsightEngine;
  conversationSessionManager: ConversationSessionManager;
  dataStore: DataStore;
  activeChildProfileId: () => string | null;
}

/**
 * Render the Conversation View into the given container.
 * Shows a text input for queries, conversation turns, recent queries, and a new-conversation button.
 */
export function renderConversationView(container: HTMLElement, deps: ConversationViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">💬</span>Chat</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  // Header with photo
  container.appendChild(createHeaderWithPhoto('💬', 'Chat', profileId));

  // Get or create session
  let session = deps.conversationSessionManager.getActiveSession(profileId);
  if (!session) {
    session = deps.conversationSessionManager.startSession(profileId);
  }

  // New conversation button + Save button
  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:8px;gap:6px;';

  const activeSession = deps.conversationSessionManager.getActiveSession(profileId);
  const hasActiveTurns = activeSession && activeSession.turns.length > 0;

  const saveConvoBtn = document.createElement('button');
  saveConvoBtn.textContent = '💾 Save';
  saveConvoBtn.disabled = !hasActiveTurns;
  saveConvoBtn.style.cssText = `padding:6px 14px;border:1px solid var(--sage);border-radius:10px;background:var(--sage-light);font-size:0.68rem;cursor:${hasActiveTurns ? 'pointer' : 'default'};color:var(--sage);font-weight:600;opacity:${hasActiveTurns ? '1' : '0.4'};transition:opacity 0.15s;`;
  saveConvoBtn.addEventListener('click', () => {
    if (!hasActiveTurns) return;
    const title = activeSession!.turns[0]?.content.slice(0, 50) || 'Untitled';
    const archived = { ...activeSession!, archived: true, title };
    deps.dataStore.saveConversationSession(archived);
    renderConversationView(container, deps);
  });

  const newConvoBtn = document.createElement('button');
  newConvoBtn.textContent = '+ New';
  newConvoBtn.style.cssText = 'padding:6px 14px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.68rem;cursor:pointer;color:var(--accent);';
  newConvoBtn.addEventListener('click', () => {
    deps.conversationSessionManager.startSession(profileId);
    renderConversationView(container, deps);
  });
  topBar.appendChild(saveConvoBtn);
  topBar.appendChild(newConvoBtn);
  container.appendChild(topBar);

  // Archived conversations section
  const allSessions = deps.dataStore.getConversationSessions(profileId);
  const archivedSessions = allSessions.filter((s) => s.archived && s.turns.length > 0);
  if (archivedSessions.length > 0) {
    const archiveCard = document.createElement('div');
    archiveCard.className = 'soft-card';
    archiveCard.style.cssText = 'padding:10px 12px;margin-bottom:8px;';

    const archiveToggle = document.createElement('button');
    archiveToggle.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;border:none;background:none;cursor:pointer;padding:0;';
    archiveToggle.innerHTML = `<span style="font-size:0.68rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;">📂 Saved (${archivedSessions.length})</span><span style="font-size:0.7rem;color:var(--text-muted);" id="archive-chevron">▸</span>`;

    const archiveContent = document.createElement('div');
    archiveContent.style.cssText = 'display:none;margin-top:8px;';

    archiveToggle.addEventListener('click', () => {
      const isHidden = archiveContent.style.display === 'none';
      archiveContent.style.display = isHidden ? 'block' : 'none';
      const chevron = archiveToggle.querySelector('#archive-chevron') as HTMLElement;
      if (chevron) chevron.textContent = isHidden ? '▾' : '▸';
    });

    for (const archived of archivedSessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;cursor:pointer;';
      info.innerHTML = `
        <div style="font-size:0.7rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${archived.title || 'Untitled'}</div>
        <div style="font-size:0.58rem;color:var(--text-muted);">${archived.turns.length} messages · ${archived.lastActivityAt.toLocaleDateString()}</div>`;
      info.addEventListener('click', () => {
        // Load this archived conversation as the active session
        deps.dataStore.saveConversationSession({ ...archived });
        (deps.conversationSessionManager as any).activeSessionIds?.set(profileId, archived.id);
        renderConversationView(container, deps);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'padding:4px 8px;border:1px solid var(--danger);border-radius:8px;background:rgba(235,87,87,0.06);font-size:0.6rem;cursor:pointer;color:var(--danger);flex-shrink:0;margin-left:6px;';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteConfirm(container, deps, archived.id, archived.title || 'Untitled');
      });

      row.appendChild(info);
      row.appendChild(deleteBtn);
      archiveContent.appendChild(row);
    }

    archiveCard.appendChild(archiveToggle);
    archiveCard.appendChild(archiveContent);
    container.appendChild(archiveCard);
  }

  // Document selector — let user choose which docs are included in context
  const allDocs = deps.dataStore.getArchivedDocuments(profileId);
  const docsWithText = allDocs.filter((d) => d.extractedText && d.extractedText.length > 0);

  if (docsWithText.length > 0) {
    const docSelector = document.createElement('div');
    docSelector.style.cssText = 'margin-bottom:8px;padding:8px 12px;background:var(--card);border-radius:10px;border:1px solid var(--border);';

    const docHeader = document.createElement('div');
    docHeader.style.cssText = 'font-size:0.6rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;';
    docHeader.textContent = `📄 Knowledge base (${docsWithText.length} doc${docsWithText.length > 1 ? 's' : ''})`;
    docSelector.appendChild(docHeader);

    for (const doc of docsWithText) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;font-size:0.65rem;color:var(--text);';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.docId = doc.id;
      cb.style.cssText = 'flex-shrink:0;';

      const label = document.createElement('span');
      label.textContent = `${doc.fileReference}${doc.sourceProvider ? ` (${doc.sourceProvider})` : ''}`;
      label.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

      row.appendChild(cb);
      row.appendChild(label);
      docSelector.appendChild(row);
    }
    container.appendChild(docSelector);
  }

  // Recent queries for quick reference
  const recentQueries = deps.conversationSessionManager.getRecentQueries(profileId, 3);
  if (recentQueries.length > 0) {
    const recentCard = document.createElement('div');
    recentCard.className = 'soft-card';
    recentCard.innerHTML = '<h2>Recent Questions</h2>';
    for (const q of recentQueries) {
      const qBtn = document.createElement('button');
      qBtn.textContent = truncate(q.content, 60);
      qBtn.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 10px;margin-bottom:4px;border:1px solid var(--border);border-radius:8px;background:var(--accent-light);font-size:0.7rem;cursor:pointer;color:var(--text);';
      qBtn.addEventListener('click', () => {
        submitQuery(container, deps, profileId, q.content);
      });
      recentCard.appendChild(qBtn);
    }
    container.appendChild(recentCard);
  }

  // Conversation turns
  const currentSession = deps.conversationSessionManager.getActiveSession(profileId);
  if (currentSession && currentSession.turns.length > 0) {
    const turnsContainer = document.createElement('div');
    for (const turn of currentSession.turns) {
      const turnEl = document.createElement('div');
      turnEl.className = 'soft-card';
      const isParent = turn.role === 'parent';
      turnEl.style.cssText = isParent
        ? 'background:var(--sage-light);border-left:3px solid var(--sage);'
        : 'background:rgba(74,144,226,0.04);border-left:3px solid var(--accent);';

      turnEl.innerHTML = `
        <div style="font-size:0.62rem;font-weight:600;color:${isParent ? 'var(--sage)' : 'var(--accent)'};margin-bottom:4px;">
          ${isParent ? 'You' : 'Attune'}
        </div>
        <p style="font-size:0.75rem;color:var(--text);line-height:1.5;margin:0;">${formatMarkdown(turn.content)}</p>
        <div style="font-size:0.58rem;color:var(--text-muted);margin-top:4px;">${turn.timestamp.toLocaleTimeString()}</div>`;
      turnsContainer.appendChild(turnEl);
    }
    container.appendChild(turnsContainer);
  }

  // Input area
  const inputCard = document.createElement('div');
  inputCard.className = 'soft-card';
  inputCard.style.cssText = 'position:sticky;bottom:0;';

  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:flex;gap:8px;';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Ask about patterns, triggers, strategies...';
  textInput.style.cssText = 'flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-btn);font-size:0.75rem;background:white;color:var(--text);';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '→';
  sendBtn.style.cssText = 'padding:10px 16px;border:none;border-radius:var(--radius-btn);background:var(--gradient-primary);color:white;font-size:0.85rem;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(74,144,226,0.2);';

  const handleSend = (): void => {
    const query = textInput.value.trim();
    if (!query) return;
    textInput.value = '';
    submitQuery(container, deps, profileId, query);
  };

  sendBtn.addEventListener('click', handleSend);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  inputRow.appendChild(textInput);
  inputRow.appendChild(sendBtn);
  inputCard.appendChild(inputRow);
  container.appendChild(inputCard);
}

async function submitQuery(
  container: HTMLElement,
  deps: ConversationViewDeps,
  profileId: string,
  query: string,
): Promise<void> {
  let session = deps.conversationSessionManager.getActiveSession(profileId);
  if (!session) {
    session = deps.conversationSessionManager.startSession(profileId);
  }

  // Add parent turn
  const parentTurn: ConversationTurn = {
    role: 'parent',
    content: query,
    timestamp: new Date(),
  };
  deps.conversationSessionManager.addTurn(session.id, parentTurn);

  // Re-render to show the parent message
  renderConversationView(container, deps);

  // Show thinking animation — insert before the input card (last child)
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'soft-card';
  thinkingEl.style.cssText = 'background:rgba(74,144,226,0.04);border-left:3px solid var(--accent);';
  thinkingEl.innerHTML = `
    <div style="font-size:0.62rem;font-weight:600;color:var(--accent);margin-bottom:4px;">Attune</div>
    <div style="display:flex;align-items:center;gap:4px;">
      <span class="thinking-dots" style="display:inline-flex;gap:3px;">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 1.2s infinite 0s;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 1.2s infinite 0.2s;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 1.2s infinite 0.4s;"></span>
      </span>
      <span style="font-size:0.7rem;color:var(--text-dim);margin-left:4px;">Thinking...</span>
    </div>`;
  // Add keyframe animation via style element if not already present
  if (!document.getElementById('attune-thinking-style')) {
    const style = document.createElement('style');
    style.id = 'attune-thinking-style';
    style.textContent = `@keyframes pulse { 0%,100% { opacity:0.3;transform:scale(0.8); } 50% { opacity:1;transform:scale(1.2); } }`;
    document.head.appendChild(style);
  }
  // Insert before the last child (the input card) so thinking appears above the prompt
  const inputCardEl = container.lastElementChild;
  if (inputCardEl) {
    container.insertBefore(thinkingEl, inputCardEl);
  } else {
    container.appendChild(thinkingEl);
  }

  // Get updated session for the query
  const updatedSession = deps.conversationSessionManager.getActiveSession(profileId);
  if (!updatedSession) return;

  try {
    let responseText: string;
    const apiKey = getOpenAIKey();

    if (apiKey) {
      // Use OpenAI directly with real event data
      const allEvents = deps.dataStore.getEvents({ childProfileId: profileId });
      const contextEntries = deps.dataStore.getContextEntries({ childProfileId: profileId });

      // Build a summary of events for the LLM
      const eventSummary = allEvents.slice(0, 50).map((e) => {
        const date = e.timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const time = e.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `- ${date} ${time}: ${e.eventType}${e.notes ? ` — "${e.notes}"` : ''}${e.tags.length > 0 ? ` [tags: ${e.tags.join(', ')}]` : ''}`;
      }).join('\n');

      const contextSummary = contextEntries.slice(0, 20).map((c) => {
        return `- ${c.contextType}/${c.subType} (${c.startTime.toLocaleDateString()}${c.endTime ? ' to ' + c.endTime.toLocaleDateString() : ' — ongoing'})`;
      }).join('\n');

      // Conversation history for context
      const history = updatedSession.turns.slice(-6).map((t) => `${t.role}: ${t.content}`).join('\n');

      const systemPrompt = `You are Attune, a compassionate caregiving assistant for parents of neurodivergent children. 
Answer questions based ONLY on the actual logged event data provided below. Be specific, reference actual dates and events.
Use warm, supportive, neuro-affirming language. Never use clinical or judgmental terms.
If the data doesn't contain enough information to answer, say so honestly and suggest what to log.`;

      // Include document content — respect user's document selection checkboxes
      const allDocuments = deps.dataStore.getArchivedDocuments(profileId);
      
      // Check which docs are selected via checkboxes in the DOM
      const selectedDocIds = new Set<string>();
      const checkboxes = container.closest('.phone-frame')?.querySelectorAll<HTMLInputElement>('input[data-doc-id]');
      if (checkboxes) {
        checkboxes.forEach((cb) => {
          if (cb.checked && cb.dataset.docId) {
            selectedDocIds.add(cb.dataset.docId);
          }
        });
      }

      const documents = allDocuments
        .filter((d) => d.extractedText && d.extractedText.length > 0)
        .filter((d) => selectedDocIds.size === 0 || selectedDocIds.has(d.id));

      const docSummary = documents
        .map((d) => {
          return `--- ${d.documentType.toUpperCase()}${d.sourceProvider ? ` from ${d.sourceProvider}` : ''} (${d.fileReference}) ---\n${d.extractedText}`;
        })
        .join('\n\n');

      const userPrompt = `LOGGED EVENTS (most recent first):
${eventSummary || '(No events logged yet)'}

CONTEXT ENTRIES:
${contextSummary || '(None)'}

UPLOADED DOCUMENTS:
${docSummary || '(No documents uploaded)'}

CONVERSATION HISTORY:
${history}

PARENT'S QUESTION: ${query}

Answer based on the actual data above. Be specific about dates, events, and document content when relevant.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content ?? 'I couldn\'t generate a response.';
    } else {
      // Fallback to insight engine (mock)
      const result: ConversationResponse = await deps.insightEngine.answerQuery(updatedSession, query);
      responseText = result.narrative;
    }

    // Add assistant turn
    const assistantTurn: ConversationTurn = {
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };
    deps.conversationSessionManager.addTurn(updatedSession.id, assistantTurn);
  } catch {
    const errorTurn: ConversationTurn = {
      role: 'assistant',
      content: 'Sorry, I had trouble processing that question. Please try again.',
      timestamp: new Date(),
    };
    deps.conversationSessionManager.addTurn(updatedSession.id, errorTurn);
  }

  // Re-render with the response
  renderConversationView(container, deps);
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '…';
}

/** Convert markdown bold (**text**) to HTML <strong> tags */
function formatMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Show a confirmation modal before deleting a saved conversation. */
function showDeleteConfirm(
  container: HTMLElement,
  deps: ConversationViewDeps,
  sessionId: string,
  title: string,
): void {
  const phoneFrame = container.closest('.phone-frame') ?? container;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;width:100%;max-width:280px;border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.15);text-align:center;';

  card.innerHTML = `
    <div style="font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:6px;">Delete this conversation?</div>
    <div style="font-size:0.68rem;color:var(--text-dim);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${title}"</div>
    <div style="font-size:0.62rem;font-weight:600;color:var(--danger);margin-bottom:12px;">⚠️ This cannot be undone.</div>`;

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
    deps.dataStore.deleteConversationSession(sessionId);
    renderConversationView(container, deps);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  phoneFrame.appendChild(overlay);
}
