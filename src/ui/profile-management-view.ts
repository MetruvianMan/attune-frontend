import type { DataStore } from '@src/data-store/data-store.js';
import type { ChildProfile } from '@src/models/index.js';
import { exportEventsToCSV, exportFullBackup, importFullBackup } from '@src/data-store/export-import.js';

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
      Create a child profile to start tracking and gaining insights.`;
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
  backupBtn.addEventListener('click', () => exportFullBackup());
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
  container.appendChild(dataCard);
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
