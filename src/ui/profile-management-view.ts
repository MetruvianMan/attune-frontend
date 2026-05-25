import type { DataStore } from '@src/data-store/data-store.js';
import type { ChildProfile } from '@src/models/index.js';
import { exportEventsToCSV, exportFullBackup, importFullBackup } from '@src/data-store/export-import.js';
import { syncService } from '@src/services/sync-service.js';

export interface ProfileViewDeps {
  dataStore: DataStore;
  activeChildProfileId: () => string | null;
  setActiveChildProfileId: (id: string | null) => void;
  onProfileChange: () => void;
}

/**
 * Render the Profile Management View into the given container.
 * Shows profile list, create/edit/delete, and guided onboarding.
 */
export function renderProfileView(container: HTMLElement, deps: ProfileViewDeps): void {
  container.innerHTML = '';

  const header = document.createElement('h1');
  header.innerHTML = '<span class="emoji">👤</span>Profiles';
  header.style.marginTop = '16px';
  container.appendChild(header);

  const profiles = deps.dataStore.listChildProfiles();
  const activeId = deps.activeChildProfileId();

  // Cloud Sync Card (show FIRST, before profiles, so it's always accessible)
  renderCloudSyncCard(container, deps);

  // Create new profile button
  const createBtn = document.createElement('button');
  createBtn.textContent = '+ Create New Profile';
  createBtn.style.cssText = 'width:100%;padding:12px;border:1px solid var(--accent);border-radius:12px;background:var(--accent-light);font-size:0.78rem;font-weight:600;cursor:pointer;color:var(--accent);margin-bottom:14px;';
  createBtn.addEventListener('click', () => {
    renderOnboardingForm(container, deps, null);
  });
  container.appendChild(createBtn);

  if (profiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'placeholder';
    empty.innerHTML = `
      <span class="placeholder-icon">🌱</span>
      <div class="placeholder-title">No profiles yet</div>
      Download synced data or create a child profile to start tracking.`;
    container.appendChild(empty);
    return;
  }

  // Profile list
  for (const profile of profiles) {
    const card = document.createElement('div');
    card.className = 'soft-card';
    const isActive = profile.id === activeId;
    if (isActive) {
      card.style.borderLeft = '3px solid var(--accent)';
    }

    // Outer row: left column (info + buttons) and right column (photo), vertically centered
    const cardRow = document.createElement('div');
    cardRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

    // Left column: text info + action buttons
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'flex:1;min-width:0;';
    leftCol.innerHTML = `
      <div>
        <span style="font-size:0.85rem;font-weight:600;color:var(--text);">${profile.displayName}</span>
        ${profile.alias ? `<span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px;">(${profile.alias})</span>` : ''}
        ${isActive ? '<span style="font-size:0.6rem;color:var(--accent);margin-left:6px;font-weight:600;">ACTIVE</span>' : ''}
      </div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">Age ${profile.age}</div>
      ${profile.diagnosis ? `<div style="font-size:0.68rem;color:var(--text-dim);margin-top:2px;">${profile.diagnosis}</div>` : ''}`;

    // Action buttons inside the left column, tight spacing
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:6px;';

    if (!isActive) {
      const switchBtn = document.createElement('button');
      switchBtn.textContent = 'Switch to';
      switchBtn.style.cssText = 'padding:6px 12px;border:1px solid var(--accent);border-radius:8px;background:var(--accent-light);font-size:0.65rem;cursor:pointer;color:var(--accent);';
      switchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deps.setActiveChildProfileId(profile.id);
        deps.onProfileChange();
        renderProfileView(container, deps);
      });
      actions.appendChild(switchBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.style.cssText = 'padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);font-size:0.65rem;cursor:pointer;color:var(--text);';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderOnboardingForm(container, deps, profile);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = 'padding:6px 12px;border:1px solid var(--danger);border-radius:8px;background:rgba(199,92,92,0.08);font-size:0.65rem;cursor:pointer;color:var(--danger);';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderDeleteConfirmation(container, deps, profile);
    });
    actions.appendChild(deleteBtn);

    leftCol.appendChild(actions);
    cardRow.appendChild(leftCol);

    // Right column: photo, vertically centered by the flex parent
    const cardPhoto = document.createElement('div');
    cardPhoto.style.cssText = 'width:128px;height:128px;border-radius:50%;background:var(--accent-light);border:3px solid var(--accent);overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:12px;';
    const savedPhoto = localStorage.getItem(`attune-profile-photo-${profile.id}`);
    if (savedPhoto) {
      const img = document.createElement('img');
      img.src = savedPhoto;
      img.alt = profile.displayName;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      cardPhoto.appendChild(img);
    } else {
      cardPhoto.style.fontSize = '3rem';
      cardPhoto.style.color = 'var(--accent)';
      cardPhoto.textContent = '👤';
    }
    cardRow.appendChild(cardPhoto);

    card.appendChild(cardRow);
    container.appendChild(card);
  }

  // Data Management — after profiles
  renderDataManagementCard(container, deps, activeId);
}

function renderDataManagementCard(container: HTMLElement, deps: ProfileViewDeps, activeId: string | null) {
  const dataCard = document.createElement('div');
  dataCard.className = 'soft-card';
  dataCard.style.cssText += 'padding:10px 12px;margin-bottom:14px;';
  dataCard.innerHTML = '<h2 style="margin-bottom:6px;">Data</h2><div style="font-size:0.58rem;color:var(--text-muted);margin-bottom:8px;line-height:1.3;">Export = CSV of events for spreadsheets · Backup = full JSON snapshot · Restore = reload from a backup file</div>';

  const dataBtnRow = document.createElement('div');
  dataBtnRow.style.cssText = 'display:flex;gap:5px;';

  if (activeId) {
    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.textContent = '📊 Export';
    exportCsvBtn.style.cssText = 'flex:1;padding:7px 6px;border:1px solid var(--accent);border-radius:var(--radius-input);background:var(--accent-light);font-size:0.62rem;cursor:pointer;color:var(--accent);font-weight:600;';
    exportCsvBtn.addEventListener('click', () => {
      const profile = deps.dataStore.listChildProfiles().find((p) => p.id === activeId);
      exportEventsToCSV(deps.dataStore, activeId, profile?.displayName ?? 'child');
    });
    dataBtnRow.appendChild(exportCsvBtn);
  }

  const backupBtn = document.createElement('button');
  backupBtn.textContent = '💾 Backup';
  backupBtn.style.cssText = 'flex:1;padding:7px 6px;border:1px solid var(--sage);border-radius:var(--radius-input);background:var(--sage-light);font-size:0.62rem;cursor:pointer;color:var(--sage);font-weight:600;';
  backupBtn.addEventListener('click', async () => {
    backupBtn.disabled = true;
    backupBtn.textContent = '⏳ Backing up...';
    try {
      await exportFullBackup();
    } finally {
      backupBtn.disabled = false;
      backupBtn.textContent = '💾 Backup';
    }
  });
  dataBtnRow.appendChild(backupBtn);

  const restoreBtn = document.createElement('button');
  restoreBtn.textContent = '📥 Restore';
  restoreBtn.style.cssText = 'flex:1;padding:7px 6px;border:1px solid var(--text-muted);border-radius:var(--radius-input);background:var(--card);font-size:0.62rem;cursor:pointer;color:var(--text-dim);font-weight:600;';
  restoreBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ok = await importFullBackup(file);
      if (ok) {
        alert('Backup restored. The page will reload.');
        window.location.reload();
      }
    });
    input.click();
  });
  dataBtnRow.appendChild(restoreBtn);

  dataCard.appendChild(dataBtnRow);

  // Storage Management Row
  const storageBtnRow = document.createElement('div');
  storageBtnRow.style.cssText = 'display:flex;gap:5px;margin-top:6px;';

  const clearConversationsBtn = document.createElement('button');
  clearConversationsBtn.textContent = '💬 Clear Chats';
  clearConversationsBtn.style.cssText = 'flex:1;padding:7px 6px;border:1px solid var(--warning);border-radius:var(--radius-input);background:rgba(242,201,76,0.1);font-size:0.62rem;cursor:pointer;color:var(--warning);font-weight:600;';
  clearConversationsBtn.addEventListener('click', async () => {
    if (!confirm('Clear all conversation history to free up storage space? Your events and other data will be preserved.')) return;
    
    // Get all profiles and delete all their conversation sessions
    const profiles = deps.dataStore.listChildProfiles();
    let count = 0;
    
    profiles.forEach(profile => {
      const sessions = deps.dataStore.getConversationSessions(profile.id);
      sessions.forEach(session => {
        deps.dataStore.deleteConversationSession(session.id);
        count++;
      });
    });
    
    // Force a save to persist the changes
    await deps.dataStore.persistToLocalStorage();
    
    alert(`Cleared ${count} conversation sessions. Storage space freed. Refresh the page to continue.`);
    window.location.reload();
  });
  storageBtnRow.appendChild(clearConversationsBtn);

  const checkStorageBtn = document.createElement('button');
  checkStorageBtn.textContent = '📊 Check Storage';
  checkStorageBtn.style.cssText = 'flex:1;padding:7px 6px;border:1px solid var(--text-muted);border-radius:var(--radius-input);background:var(--card);font-size:0.62rem;cursor:pointer;color:var(--text-dim);font-weight:600;';
  checkStorageBtn.addEventListener('click', async () => {
    try {
      // Try to get data from IndexedDB first
      const indexedDBStore = new (await import('@src/data-store/indexed-db-store.js')).IndexedDBStore();
      await indexedDBStore.initialize();
      const raw = await indexedDBStore.load('attune-app-data') as string | null;
      
      if (!raw) {
        // Fall back to localStorage for legacy data
        const legacyRaw = localStorage.getItem('attune-app-data');
        if (!legacyRaw) {
          alert('No data found in storage (checked both IndexedDB and localStorage)');
          return;
        }
        alert('⚠️ Data found in localStorage (legacy). It will be migrated to IndexedDB on next app load.\n\nSize: ' + (legacyRaw.length / 1024).toFixed(1) + 'KB');
        return;
      }
      
      const data = JSON.parse(raw);
      const totalSize = raw.length;
      const breakdown: Record<string, number> = {};
      
      for (const [key, value] of Object.entries(data)) {
        breakdown[key] = JSON.stringify(value).length;
      }
      
      const sorted = Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([key, size]) => `${key}: ${(size / 1024).toFixed(1)}KB (${((size / totalSize) * 100).toFixed(1)}%)`)
        .join('\n');
      
      alert(`Total Storage (IndexedDB): ${(totalSize / 1024).toFixed(1)}KB (${(totalSize / (1024 * 1024)).toFixed(2)}MB)\n\nBreakdown:\n${sorted}\n\nIndexedDB limit: ~50-100MB (much larger than localStorage)`);
    } catch (e) {
      alert('Error checking storage: ' + e);
    }
  });
  storageBtnRow.appendChild(checkStorageBtn);

  dataCard.appendChild(storageBtnRow);
  
  container.appendChild(dataCard);
}

function renderCloudSyncCard(container: HTMLElement, deps: ProfileViewDeps) {
  // Sync Card (optional multi-user sync)
  const syncCard = document.createElement('div');
  syncCard.className = 'soft-card';
  syncCard.style.cssText += 'padding:10px 12px;margin-bottom:14px;';
  
  const syncHeader = document.createElement('h2');
  syncHeader.style.marginBottom = '6px';
  syncHeader.textContent = '☁️ Cloud Sync (Optional)';
  syncCard.appendChild(syncHeader);

  const syncDesc = document.createElement('div');
  syncDesc.style.cssText = 'font-size:0.58rem;color:var(--text-muted);margin-bottom:8px;line-height:1.3;';
  syncDesc.textContent = 'Share data with family members. Your local app works without this.';
  syncCard.appendChild(syncDesc);

  // Check backend status
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = 'font-size:0.62rem;padding:6px 8px;border-radius:6px;margin-bottom:8px;';
  statusDiv.textContent = '⏳ Checking backend...';
  syncCard.appendChild(statusDiv);

  syncService.checkBackendHealth().then(isHealthy => {
    if (isHealthy) {
      statusDiv.style.background = 'rgba(76,175,80,0.1)';
      statusDiv.style.color = '#4caf50';
      statusDiv.textContent = '✓ Backend available';
    } else {
      statusDiv.style.background = 'rgba(255,152,0,0.1)';
      statusDiv.style.color = '#ff9800';
      statusDiv.textContent = '⚠ Backend offline (local mode only)';
    }
  });

  // Auth section
  if (!syncService.isAuthenticated()) {
    const authForm = document.createElement('div');
    authForm.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Email';
    emailInput.style.cssText = 'padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.7rem;';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password';
    passwordInput.style.cssText = 'padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.7rem;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your Name';
    nameInput.style.cssText = 'padding:8px;border:1px solid var(--border);border-radius:6px;font-size:0.7rem;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:5px;';

    const signupBtn = document.createElement('button');
    signupBtn.textContent = 'Sign Up';
    signupBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:6px;background:var(--accent);color:white;font-size:0.7rem;font-weight:600;cursor:pointer;';
    signupBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const name = nameInput.value.trim();

      if (!email || !password || !name) {
        alert('Please fill in all fields');
        return;
      }

      signupBtn.disabled = true;
      signupBtn.textContent = 'Creating...';

      try {
        await syncService.signup(email, password, name);
        alert('Account created! Refreshing...');
        renderProfileView(container, deps);
      } catch (error: any) {
        alert('Signup failed: ' + error.message);
        signupBtn.disabled = false;
        signupBtn.textContent = 'Sign Up';
      }
    });

    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Login';
    loginBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--accent);border-radius:6px;background:transparent;color:var(--accent);font-size:0.7rem;font-weight:600;cursor:pointer;';
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        alert('Please enter email and password');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';

      try {
        await syncService.login(email, password);
        alert('Logged in! Refreshing...');
        renderProfileView(container, deps);
      } catch (error: any) {
        alert('Login failed: ' + error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    });

    btnRow.appendChild(signupBtn);
    btnRow.appendChild(loginBtn);

    authForm.appendChild(emailInput);
    authForm.appendChild(passwordInput);
    authForm.appendChild(nameInput);
    authForm.appendChild(btnRow);

    syncCard.appendChild(authForm);
  } else {
    // Logged in - show sync buttons
    const syncBtnRow = document.createElement('div');
    syncBtnRow.style.cssText = 'display:flex;gap:5px;margin-bottom:6px;';

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = '⬆️ Upload Data';
    uploadBtn.style.cssText = 'flex:1;padding:8px;border:none;border-radius:6px;background:var(--accent);color:white;font-size:0.7rem;font-weight:600;cursor:pointer;';
    uploadBtn.addEventListener('click', async () => {
      if (!confirm('Upload your local data to the server? This will overwrite any existing synced data.')) {
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = '⏳ Uploading...';

      try {
        // Get all data from IndexedDB
        const indexedDBStore = new (await import('@src/data-store/indexed-db-store.js')).IndexedDBStore();
        await indexedDBStore.initialize();
        const raw = await indexedDBStore.load('attune-app-data') as string | null;

        if (!raw) {
          alert('No local data found to upload');
          uploadBtn.disabled = false;
          uploadBtn.textContent = '⬆️ Upload Data';
          return;
        }

        const data = JSON.parse(raw);
        await syncService.uploadData(data, 'My Family');
        alert('✓ Data uploaded successfully!');
      } catch (error: any) {
        alert('Upload failed: ' + error.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '⬆️ Upload Data';
      }
    });

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download Data';
    downloadBtn.style.cssText = 'flex:1;padding:8px;border:1px solid var(--accent);border-radius:6px;background:transparent;color:var(--accent);font-size:0.7rem;font-weight:600;cursor:pointer;';
    downloadBtn.addEventListener('click', async () => {
      if (!confirm('Download synced data from server? This will replace your local data.')) {
        return;
      }

      downloadBtn.disabled = true;
      downloadBtn.textContent = '⏳ Downloading...';

      try {
        const data = await syncService.downloadData();
        
        // Check data size
        const dataStr = JSON.stringify(data);
        const dataSizeMB = (dataStr.length / (1024 * 1024)).toFixed(2);
        console.log(`Downloaded data size: ${dataSizeMB}MB`);
        
        if (dataStr.length > 50 * 1024 * 1024) {
          throw new Error(`Data too large (${dataSizeMB}MB). Try clearing conversations first.`);
        }
        
        // Save to IndexedDB
        const indexedDBStore = new (await import('@src/data-store/indexed-db-store.js')).IndexedDBStore();
        await indexedDBStore.initialize();
        await indexedDBStore.save('attune-app-data', dataStr);

        alert(`✓ Data downloaded (${dataSizeMB}MB)! Refreshing app...`);
        window.location.reload();
      } catch (error: any) {
        console.error('Download error:', error);
        alert('Download failed: ' + error.message);
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇️ Download Data';
      }
    });

    syncBtnRow.appendChild(uploadBtn);
    syncBtnRow.appendChild(downloadBtn);
    syncCard.appendChild(syncBtnRow);

    // Logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = 'width:100%;padding:6px;border:1px solid var(--text-muted);border-radius:6px;background:transparent;color:var(--text-muted);font-size:0.65rem;cursor:pointer;';
    logoutBtn.addEventListener('click', () => {
      if (confirm('Logout? Your local data will remain safe.')) {
        syncService.logout();
        renderProfileView(container, deps);
      }
    });
    syncCard.appendChild(logoutBtn);
  }

  container.appendChild(syncCard);
}

function renderDeleteConfirmation(
  container: HTMLElement,
  deps: ProfileViewDeps,
  profile: ChildProfile,
): void {
  container.innerHTML = '';

  const header = document.createElement('h1');
  header.innerHTML = '<span class="emoji">⚠️</span>Confirm Delete';
  container.appendChild(header);

  const card = document.createElement('div');
  card.className = 'soft-card';
  card.innerHTML = `
    <p style="font-size:0.8rem;color:var(--text);line-height:1.5;margin:0 0 8px;">
      Are you sure you want to delete <strong>${profile.displayName}</strong>'s profile?
      This will permanently remove all events, insights, strategies, documents, and conversations associated with this profile.
    </p>
    <p style="font-size:0.75rem;font-weight:700;color:var(--danger);margin:0 0 12px;">
      ⚠️ This action cannot be undone.
    </p>`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.75rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => renderProfileView(container, deps));

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Delete Profile';
  confirmBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:10px;background:var(--danger);font-size:0.75rem;font-weight:600;cursor:pointer;color:white;';
  confirmBtn.addEventListener('click', () => {
    // Remove photo from localStorage
    localStorage.removeItem(`attune-profile-photo-${profile.id}`);
    deps.dataStore.deleteChildProfile(profile.id);
    if (deps.activeChildProfileId() === profile.id) {
      const remaining = deps.dataStore.listChildProfiles();
      deps.setActiveChildProfileId(remaining.length > 0 ? remaining[0].id : null);
      deps.onProfileChange();
    }
    renderProfileView(container, deps);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  card.appendChild(btnRow);
  container.appendChild(card);
}

function renderOnboardingForm(
  container: HTMLElement,
  deps: ProfileViewDeps,
  existingProfile: ChildProfile | null,
): void {
  container.innerHTML = '';

  const isEdit = existingProfile !== null;
  const header = document.createElement('h1');
  header.innerHTML = `<span class="emoji">${isEdit ? '✏️' : '🌱'}</span>${isEdit ? 'Edit Profile' : 'New Profile'}`;
  container.appendChild(header);

  const form = document.createElement('div');
  form.className = 'soft-card';

  // Profile photo upload
  const photoSection = document.createElement('div');
  photoSection.style.cssText = 'text-align:center;margin-bottom:14px;';

  const photoPreview = document.createElement('div');
  photoPreview.style.cssText = 'width:80px;height:80px;border-radius:50%;background:var(--accent-light);border:3px solid var(--accent);overflow:hidden;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;cursor:pointer;font-size:2rem;color:var(--accent);';

  // Load existing photo
  let currentPhotoDataUrl: string | null = null;
  if (existingProfile) {
    const savedPhoto = localStorage.getItem(`attune-profile-photo-${existingProfile.id}`);
    if (savedPhoto) {
      currentPhotoDataUrl = savedPhoto;
      const img = document.createElement('img');
      img.src = savedPhoto;
      img.alt = 'Profile photo';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      photoPreview.appendChild(img);
    } else {
      photoPreview.textContent = '📷';
    }
  } else {
    photoPreview.textContent = '📷';
  }

  const photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.style.display = 'none';

  photoInput.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentPhotoDataUrl = reader.result as string;
      photoPreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = currentPhotoDataUrl;
      img.alt = 'Profile photo';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      photoPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  photoPreview.addEventListener('click', () => photoInput.click());

  const photoLabel = document.createElement('div');
  photoLabel.textContent = 'Tap to upload photo';
  photoLabel.style.cssText = 'font-size:0.62rem;color:var(--text-muted);';

  photoSection.appendChild(photoPreview);
  photoSection.appendChild(photoInput);
  photoSection.appendChild(photoLabel);
  form.appendChild(photoSection);

  // Name
  form.appendChild(createLabel('Display Name'));
  const nameInput = createInput('text', 'Child\'s name', existingProfile?.displayName ?? '');
  form.appendChild(nameInput);

  // Alias
  form.appendChild(createLabel('Alias (optional, for privacy)'));
  const aliasInput = createInput('text', 'Alias', existingProfile?.alias ?? '');
  form.appendChild(aliasInput);

  // Age
  form.appendChild(createLabel('Age'));
  const ageInput = createInput('number', 'Age', existingProfile?.age?.toString() ?? '');
  form.appendChild(ageInput);

  // Diagnosis
  form.appendChild(createLabel('Diagnosis (optional)'));
  const diagnosisInput = createInput('text', 'e.g., Autism, ADHD', existingProfile?.diagnosis ?? '');
  form.appendChild(diagnosisInput);

  // Intake profile fields
  const intake = existingProfile?.intakeProfile;

  form.appendChild(createLabel('Grade (optional)'));
  const gradeInput = createInput('text', 'e.g., 3rd grade', intake?.biographical?.grade ?? '');
  form.appendChild(gradeInput);

  form.appendChild(createLabel('Strengths (comma-separated)'));
  const strengthsInput = createInput('text', 'e.g., creative, empathetic', intake?.strengths?.join(', ') ?? '');
  form.appendChild(strengthsInput);

  form.appendChild(createLabel('Struggles (comma-separated)'));
  const strugglesInput = createInput('text', 'e.g., transitions, loud noises', intake?.struggles?.join(', ') ?? '');
  form.appendChild(strugglesInput);

  form.appendChild(createLabel('Traits (comma-separated)'));
  const traitsInput = createInput('text', 'e.g., detail-oriented, visual learner', intake?.traits?.join(', ') ?? '');
  form.appendChild(traitsInput);

  form.appendChild(createLabel('Sensory Sensitivities (comma-separated)'));
  const sensitivitiesInput = createInput('text', 'e.g., loud sounds, bright lights', intake?.sensoryPreferences?.sensitivities?.join(', ') ?? '');
  form.appendChild(sensitivitiesInput);

  form.appendChild(createLabel('Communication Style'));
  const commSelect = document.createElement('select');
  commSelect.style.cssText = 'width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:0.72rem;margin-bottom:10px;background:white;color:var(--text);';
  for (const opt of ['verbal', 'limited_verbal', 'aac_user'] as const) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt.replace(/_/g, ' ');
    if (intake?.communicationStyle?.type === opt) option.selected = true;
    commSelect.appendChild(option);
  }
  form.appendChild(commSelect);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:0.75rem;cursor:pointer;color:var(--text);';
  cancelBtn.addEventListener('click', () => renderProfileView(container, deps));

  const saveBtn = document.createElement('button');
  saveBtn.textContent = isEdit ? 'Save Changes' : 'Create Profile';
  saveBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:10px;background:var(--accent);font-size:0.75rem;font-weight:600;cursor:pointer;color:white;';
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const age = parseInt(ageInput.value, 10);
    if (!name || isNaN(age) || age < 0) {
      alert('Please provide a valid name and age.');
      return;
    }

    const splitList = (val: string): string[] =>
      val.split(',').map((s) => s.trim()).filter(Boolean);

    const profileData = {
      displayName: name,
      alias: aliasInput.value.trim() || undefined,
      age,
      diagnosis: diagnosisInput.value.trim() || undefined,
      intakeProfile: {
        biographical: {
          grade: gradeInput.value.trim() || undefined,
        },
        traits: splitList(traitsInput.value),
        strengths: splitList(strengthsInput.value),
        struggles: splitList(strugglesInput.value),
        sensoryPreferences: {
          sensitivities: splitList(sensitivitiesInput.value),
          seekingBehaviors: [],
        },
        communicationStyle: {
          type: commSelect.value as 'verbal' | 'limited_verbal' | 'aac_user',
          preferredPatterns: [],
        },
      },
    };

    if (isEdit && existingProfile) {
      deps.dataStore.updateChildProfile(existingProfile.id, profileData);
      // Save photo
      if (currentPhotoDataUrl) {
        localStorage.setItem(`attune-profile-photo-${existingProfile.id}`, currentPhotoDataUrl);
      }
    } else {
      const newProfile = deps.dataStore.createChildProfile(profileData);
      // Save photo for new profile
      if (currentPhotoDataUrl) {
        localStorage.setItem(`attune-profile-photo-${newProfile.id}`, currentPhotoDataUrl);
      }
      // Auto-select the new profile if none is active
      if (!deps.activeChildProfileId()) {
        deps.setActiveChildProfileId(newProfile.id);
        deps.onProfileChange();
      }
    }

    deps.onProfileChange();
    renderProfileView(container, deps);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);
  container.appendChild(form);
}

function createLabel(text: string): HTMLElement {
  const label = document.createElement('div');
  label.textContent = text;
  label.style.cssText = 'font-size:0.65rem;font-weight:600;color:var(--text-dim);margin-bottom:4px;margin-top:6px;text-transform:uppercase;letter-spacing:0.05em;';
  return label;
}

function createInput(type: string, placeholder: string, value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:0.72rem;margin-bottom:6px;background:white;color:var(--text);box-sizing:border-box;';
  return input;
}
