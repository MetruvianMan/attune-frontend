/**
 * Creates a tab header row with the tab title on the left and the
 * active child's name + circular profile photo (64px) on the right.
 */
export function createHeaderWithPhoto(
  emoji: string,
  title: string,
  activeProfileId: string | null,
): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

  const h1 = document.createElement('h1');
  h1.style.margin = '0';
  h1.innerHTML = `<span class="emoji">${emoji}</span>${title}`;
  row.appendChild(h1);

  if (activeProfileId) {
    // Right side: name + photo
    const rightGroup = document.createElement('div');
    rightGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

    // Child name from persisted data
    const childName = getChildName(activeProfileId);
    if (childName) {
      const nameEl = document.createElement('span');
      nameEl.textContent = childName;
      nameEl.style.cssText = 'font-size:0.72rem;font-weight:600;color:var(--text-dim);';
      rightGroup.appendChild(nameEl);
    }

    const photoKey = `attune-profile-photo-${activeProfileId}`;
    const photoDataUrl = localStorage.getItem(photoKey);

    const circle = document.createElement('div');
    circle.style.cssText = 'width:64px;height:64px;border-radius:50%;background:var(--accent-light);border:2px solid var(--accent);overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;';

    if (photoDataUrl) {
      const img = document.createElement('img');
      img.src = photoDataUrl;
      img.alt = 'Child photo';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      circle.appendChild(img);
    } else {
      circle.style.fontSize = '1.5rem';
      circle.style.color = 'var(--accent)';
      circle.textContent = '👤';
    }

    rightGroup.appendChild(circle);
    row.appendChild(rightGroup);
  }

  return row;
}

function getChildName(profileId: string): string | null {
  try {
    const raw = localStorage.getItem('attune-app-data');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const profiles = data.childProfiles;
    if (Array.isArray(profiles)) {
      // Stored as [id, profile] tuples from Map.entries()
      const entry = profiles.find((p: [string, { displayName?: string }]) => p[0] === profileId);
      return entry?.[1]?.displayName ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
