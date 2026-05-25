import type { DataStore } from '@src/data-store/data-store.js';
import type { RelationshipPerson, RelationshipCategory, RelationshipPersonInput } from '@src/models/index.js';
import { computeNetworkLayout, getInitials } from './network-layout.js';
import type { NetworkNode } from './network-layout.js';
import { createHeaderWithPhoto } from './header-with-photo.js';

export interface RelationshipsViewDeps {
  dataStore: DataStore;
  activeChildProfileId: () => string | null;
  onDataChange: () => void;
}

const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  Family: '#7FBF9F',
  'Family (Extended)': '#5DADE2',
  Friends: '#4A90E2',
  Childcare: '#F2C94C',
  Professional: '#9b8ec4',
};

const CATEGORIES: RelationshipCategory[] = ['Family', 'Family (Extended)', 'Friends', 'Childcare', 'Professional'];

/**
 * Render the Relationships View into the given container.
 * Shows a radial network graph of people in the child's life,
 * with add/edit/delete functionality and detail views.
 */
export function renderRelationshipsView(container: HTMLElement, deps: RelationshipsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) {
    container.innerHTML = `
      <h1><span class="emoji">🌳</span>Circle</h1>
      <div class="placeholder">
        <span class="placeholder-icon">👤</span>
        <div class="placeholder-title">No profile selected</div>
        Create a child profile in the Profile tab to get started.
      </div>`;
    return;
  }

  container.appendChild(createHeaderWithPhoto('🌳', 'Circle', profileId));

  const persons = deps.dataStore.getRelationshipPersons(profileId);

  // View state
  type ViewState =
    | { mode: 'network' }
    | { mode: 'detail'; personId: string }
    | { mode: 'form'; editingPerson: RelationshipPerson | null };

  let viewState: ViewState = { mode: 'network' };

  // Category filter state (Enhancement 3)
  let activeFilter: RelationshipCategory | 'All' = 'All';

  // Form state
  let formName = '';
  let formCategory: RelationshipCategory = 'Family';
  let formRoleLabel = '';
  let formNotes = '';
  let formPhotoBase64: string | undefined = undefined;
  let formPhotoZoom = 1.0;
  // Photo pan offset in pixels (applied before zoom, relative to the 160px preview)
  let formPhotoPanX = 0;
  let formPhotoPanY = 0;

  const contentArea = document.createElement('div');
  container.appendChild(contentArea);

  function render(): void {
    contentArea.innerHTML = '';

    if (viewState.mode === 'network') {
      renderNetworkView();
    } else if (viewState.mode === 'detail') {
      renderDetailView(viewState.personId);
    } else if (viewState.mode === 'form') {
      renderFormView(viewState.editingPerson);
    }
  }

  function renderNetworkView(): void {
    if (persons.length === 0) {
      contentArea.innerHTML = `
        <div class="placeholder">
          <span class="placeholder-icon">👥</span>
          <div class="placeholder-title">Add your first person</div>
          Add the people in your child's life to build their support network.
        </div>`;
      // Add button even in empty state
      contentArea.appendChild(createAddButton());
      return;
    }

    // === Enhancement 3: Category Filter Tabs ===
    const filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;justify-content:center;';

    const allFilters: Array<RelationshipCategory | 'All'> = ['All', ...CATEGORIES];
    for (const filter of allFilters) {
      const btn = document.createElement('button');
      const isActive = activeFilter === filter;
      const color = filter === 'All' ? 'var(--accent)' : CATEGORY_COLORS[filter];
      btn.style.cssText = `padding:4px 10px;border-radius:12px;font-size:0.6rem;font-weight:600;cursor:pointer;border:1.5px solid ${color};background:${isActive ? color : 'transparent'};color:${isActive ? 'white' : color};transition:background 0.15s,color 0.15s;`;
      btn.textContent = filter;
      btn.addEventListener('click', () => {
        activeFilter = filter;
        render();
      });
      filterRow.appendChild(btn);
    }
    contentArea.appendChild(filterRow);

    // Filter persons based on active filter
    const filteredPersons = activeFilter === 'All'
      ? persons
      : persons.filter(p => p.category === activeFilter);

    // SVG network graph — larger canvas (Enhancement 2)
    const svgWidth = 600;
    const svgHeight = 600;
    const layout = computeNetworkLayout(filteredPersons, svgWidth, svgHeight);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(svgWidth));
    svg.setAttribute('height', String(svgHeight));
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.style.cssText = 'display:block;';

    // Defs for clip paths
    const defs = document.createElementNS(svgNS, 'defs');

    // Gradient for center node
    const gradient = document.createElementNS(svgNS, 'radialGradient');
    gradient.setAttribute('id', 'center-gradient');
    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#4A90E2');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#7FBF9F');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    // Clip path for center node photo
    const centerClip = document.createElementNS(svgNS, 'clipPath');
    centerClip.setAttribute('id', 'clip-center');
    const centerClipCircle = document.createElementNS(svgNS, 'circle');
    centerClipCircle.setAttribute('cx', String(layout.centerNode.x));
    centerClipCircle.setAttribute('cy', String(layout.centerNode.y));
    centerClipCircle.setAttribute('r', String(layout.centerNode.radius));
    centerClip.appendChild(centerClipCircle);
    defs.appendChild(centerClip);

    // Clip paths for person photos
    for (const node of layout.personNodes) {
      const clipPath = document.createElementNS(svgNS, 'clipPath');
      clipPath.setAttribute('id', `clip-${node.id}`);
      const clipCircle = document.createElementNS(svgNS, 'circle');
      clipCircle.setAttribute('cx', String(node.x));
      clipCircle.setAttribute('cy', String(node.y));
      clipCircle.setAttribute('r', String(node.radius));
      clipPath.appendChild(clipCircle);
      defs.appendChild(clipPath);
    }

    // Yellow glow filter for center node
    const glowFilter = document.createElementNS(svgNS, 'filter');
    glowFilter.setAttribute('id', 'center-glow');
    glowFilter.setAttribute('x', '-50%');
    glowFilter.setAttribute('y', '-50%');
    glowFilter.setAttribute('width', '200%');
    glowFilter.setAttribute('height', '200%');

    const feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
    feBlur.setAttribute('stdDeviation', '6');
    feBlur.setAttribute('result', 'blur');
    // Pulsing animation on the blur
    const blurAnimate = document.createElementNS(svgNS, 'animate');
    blurAnimate.setAttribute('attributeName', 'stdDeviation');
    blurAnimate.setAttribute('values', '4;8;4');
    blurAnimate.setAttribute('dur', '3s');
    blurAnimate.setAttribute('repeatCount', 'indefinite');
    feBlur.appendChild(blurAnimate);
    glowFilter.appendChild(feBlur);

    const feFlood = document.createElementNS(svgNS, 'feFlood');
    feFlood.setAttribute('flood-color', '#F2C94C');
    feFlood.setAttribute('flood-opacity', '0.6');
    feFlood.setAttribute('result', 'color');
    glowFilter.appendChild(feFlood);

    const feComposite = document.createElementNS(svgNS, 'feComposite');
    feComposite.setAttribute('in', 'color');
    feComposite.setAttribute('in2', 'blur');
    feComposite.setAttribute('operator', 'in');
    feComposite.setAttribute('result', 'glow');
    glowFilter.appendChild(feComposite);

    const feMerge = document.createElementNS(svgNS, 'feMerge');
    const feMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
    feMergeNode1.setAttribute('in', 'glow');
    feMerge.appendChild(feMergeNode1);
    const feMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(feMergeNode2);
    glowFilter.appendChild(feMerge);

    defs.appendChild(glowFilter);

    svg.appendChild(defs);

    // Draw connecting lines
    for (const node of layout.personNodes) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(layout.centerNode.x));
      line.setAttribute('y1', String(layout.centerNode.y));
      line.setAttribute('x2', String(node.x));
      line.setAttribute('y2', String(node.y));
      line.setAttribute('stroke', CATEGORY_COLORS[node.category]);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-opacity', '0.4');
      svg.appendChild(line);
    }

    // Draw center node — child's profile photo or initials fallback
    const childPhotoUrl = localStorage.getItem('attune-profile-photo-' + profileId);
    if (childPhotoUrl) {
      // Glow circle behind the photo
      const glowCircle = document.createElementNS(svgNS, 'circle');
      glowCircle.setAttribute('cx', String(layout.centerNode.x));
      glowCircle.setAttribute('cy', String(layout.centerNode.y));
      glowCircle.setAttribute('r', String(layout.centerNode.radius + 4));
      glowCircle.setAttribute('fill', '#F2C94C');
      glowCircle.setAttribute('opacity', '0.6');
      glowCircle.setAttribute('filter', 'url(#center-glow)');
      svg.appendChild(glowCircle);

      // Photo clipped to center circle
      const centerImage = document.createElementNS(svgNS, 'image');
      centerImage.setAttribute('x', String(layout.centerNode.x - layout.centerNode.radius));
      centerImage.setAttribute('y', String(layout.centerNode.y - layout.centerNode.radius));
      centerImage.setAttribute('width', String(layout.centerNode.radius * 2));
      centerImage.setAttribute('height', String(layout.centerNode.radius * 2));
      centerImage.setAttribute('href', childPhotoUrl);
      centerImage.setAttribute('clip-path', 'url(#clip-center)');
      centerImage.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      svg.appendChild(centerImage);
    } else {
      // Fallback: gradient circle with initials or emoji (with glow, no border)
      const glowCircle = document.createElementNS(svgNS, 'circle');
      glowCircle.setAttribute('cx', String(layout.centerNode.x));
      glowCircle.setAttribute('cy', String(layout.centerNode.y));
      glowCircle.setAttribute('r', String(layout.centerNode.radius + 4));
      glowCircle.setAttribute('fill', '#F2C94C');
      glowCircle.setAttribute('opacity', '0.6');
      glowCircle.setAttribute('filter', 'url(#center-glow)');
      svg.appendChild(glowCircle);

      const centerCircle = document.createElementNS(svgNS, 'circle');
      centerCircle.setAttribute('cx', String(layout.centerNode.x));
      centerCircle.setAttribute('cy', String(layout.centerNode.y));
      centerCircle.setAttribute('r', String(layout.centerNode.radius));
      centerCircle.setAttribute('fill', 'url(#center-gradient)');
      svg.appendChild(centerCircle);

      const childProfile = deps.dataStore.getChildProfile(profileId!);
      const centerText = document.createElementNS(svgNS, 'text');
      centerText.setAttribute('x', String(layout.centerNode.x));
      centerText.setAttribute('y', String(layout.centerNode.y + 6));
      centerText.setAttribute('text-anchor', 'middle');
      centerText.setAttribute('fill', 'white');
      centerText.setAttribute('font-size', '16');
      centerText.setAttribute('font-weight', '600');
      centerText.textContent = childProfile ? getInitials(childProfile.displayName) : '👶';
      svg.appendChild(centerText);
    }

    // Draw person nodes
    for (const node of layout.personNodes) {
      const group = document.createElementNS(svgNS, 'g');
      group.style.cursor = 'pointer';

      // Floating balloon animation with random offset
      const randomDelay = (Math.random() * 2).toFixed(1);
      const animateTransform = document.createElementNS(svgNS, 'animateTransform');
      animateTransform.setAttribute('attributeName', 'transform');
      animateTransform.setAttribute('type', 'translate');
      animateTransform.setAttribute('values', '0,0; 0,-3; 0,0; 0,2; 0,0');
      animateTransform.setAttribute('dur', `${(3 + Math.random() * 2).toFixed(1)}s`);
      animateTransform.setAttribute('repeatCount', 'indefinite');
      animateTransform.setAttribute('begin', `${randomDelay}s`);
      group.appendChild(animateTransform);

      if (node.photoBase64) {
        // Photo node
        const image = document.createElementNS(svgNS, 'image');
        image.setAttribute('x', String(node.x - node.radius));
        image.setAttribute('y', String(node.y - node.radius));
        image.setAttribute('width', String(node.radius * 2));
        image.setAttribute('height', String(node.radius * 2));
        image.setAttribute('href', node.photoBase64);
        image.setAttribute('clip-path', `url(#clip-${node.id})`);
        image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        group.appendChild(image);

        // Border circle
        const border = document.createElementNS(svgNS, 'circle');
        border.setAttribute('cx', String(node.x));
        border.setAttribute('cy', String(node.y));
        border.setAttribute('r', String(node.radius));
        border.setAttribute('fill', 'none');
        border.setAttribute('stroke', CATEGORY_COLORS[node.category]);
        border.setAttribute('stroke-width', '2.5');
        group.appendChild(border);
      } else {
        // Initials placeholder
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(node.x));
        circle.setAttribute('cy', String(node.y));
        circle.setAttribute('r', String(node.radius));
        circle.setAttribute('fill', CATEGORY_COLORS[node.category]);
        group.appendChild(circle);

        const initials = document.createElementNS(svgNS, 'text');
        initials.setAttribute('x', String(node.x));
        initials.setAttribute('y', String(node.y + 5));
        initials.setAttribute('text-anchor', 'middle');
        initials.setAttribute('fill', 'white');
        initials.setAttribute('font-size', String(node.radius * 0.65));
        initials.setAttribute('font-weight', '600');
        initials.textContent = getInitials(node.name);
        group.appendChild(initials);
      }

      // Name text below node (scaled up font size)
      const nameText = document.createElementNS(svgNS, 'text');
      nameText.setAttribute('x', String(node.x));
      nameText.setAttribute('y', String(node.y + node.radius + 14));
      nameText.setAttribute('text-anchor', 'middle');
      nameText.setAttribute('fill', 'var(--text)');
      nameText.setAttribute('font-size', '11');
      nameText.setAttribute('font-weight', '600');
      nameText.textContent = node.name;
      group.appendChild(nameText);

      // Role label below name — only show if different from name
      if (node.name.toLowerCase() !== node.roleLabel.toLowerCase()) {
        const roleText = document.createElementNS(svgNS, 'text');
        roleText.setAttribute('x', String(node.x));
        roleText.setAttribute('y', String(node.y + node.radius + 26));
        roleText.setAttribute('text-anchor', 'middle');
        roleText.setAttribute('fill', 'var(--text-muted)');
        roleText.setAttribute('font-size', '10');
        roleText.textContent = node.roleLabel;
        group.appendChild(roleText);
      }

      // Click handler for detail view
      group.addEventListener('click', () => {
        viewState = { mode: 'detail', personId: node.id };
        render();
      });

      svg.appendChild(group);
    }

    // === Enhancement 2: Scrollable container with pan ===
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = 'overflow:auto;height:380px;border-radius:14px;position:relative;scrollbar-width:none;';

    // Inject style for webkit scrollbar hiding
    const styleEl = document.createElement('style');
    styleEl.textContent = `.network-scroll-container::-webkit-scrollbar { display: none; }`;
    scrollContainer.appendChild(styleEl);
    scrollContainer.classList.add('network-scroll-container');

    scrollContainer.appendChild(svg);
    contentArea.appendChild(scrollContainer);

    // Edge fade overlay to hint scrollable content
    const fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = 'position:relative;margin-top:-380px;height:380px;pointer-events:none;border-radius:14px;box-shadow:inset 0 0 20px 10px rgba(247,248,246,0.7);';
    contentArea.appendChild(fadeOverlay);

    // Center the scroll position
    requestAnimationFrame(() => {
      const viewportWidth = scrollContainer.clientWidth;
      const viewportHeight = scrollContainer.clientHeight;
      scrollContainer.scrollLeft = (svgWidth - viewportWidth) / 2;
      scrollContainer.scrollTop = (svgHeight - viewportHeight) / 2;
    });

    // Add Person floating button
    contentArea.appendChild(createAddButton());
  }

  function createAddButton(): HTMLButtonElement {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-primary';
    addBtn.style.cssText = 'margin-top:12px;';
    addBtn.textContent = '+ Add Person';
    addBtn.addEventListener('click', () => {
      resetForm(null);
      viewState = { mode: 'form', editingPerson: null };
      render();
    });
    return addBtn;
  }

  function renderDetailView(personId: string): void {
    const person = deps.dataStore.getRelationshipPerson(personId);
    if (!person) {
      viewState = { mode: 'network' };
      render();
      return;
    }

    const card = document.createElement('div');
    card.className = 'soft-card';
    card.style.cssText = 'text-align:center;';

    // === Enhancement 1: Photo Zoom ===
    if (person.photoBase64) {
      let isZoomed = false;

      const photoContainer = document.createElement('div');
      photoContainer.style.cssText = 'display:flex;justify-content:center;margin-bottom:12px;';

      const img = document.createElement('img');
      img.src = person.photoBase64;
      img.style.cssText = `width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${CATEGORY_COLORS[person.category]};cursor:zoom-in;transition:width 0.3s ease,height 0.3s ease,border-radius 0.3s ease;`;

      img.addEventListener('click', (e) => {
        e.stopPropagation();
        isZoomed = !isZoomed;
        if (isZoomed) {
          img.style.width = '250px';
          img.style.height = '250px';
          img.style.borderRadius = '16px';
          img.style.cursor = 'zoom-out';
        } else {
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.borderRadius = '50%';
          img.style.cursor = 'zoom-in';
        }
      });

      photoContainer.appendChild(img);
      card.appendChild(photoContainer);
    } else {
      const initialsDiv = document.createElement('div');
      initialsDiv.style.cssText = `width:80px;height:80px;border-radius:50%;background:${CATEGORY_COLORS[person.category]};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.5rem;font-weight:700;color:white;`;
      initialsDiv.textContent = getInitials(person.name);
      card.appendChild(initialsDiv);
    }

    // Name
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:1rem;font-weight:700;color:var(--text);margin-bottom:4px;';
    nameEl.textContent = person.name;
    card.appendChild(nameEl);

    // Category badge
    const catBadge = document.createElement('span');
    catBadge.style.cssText = `display:inline-block;padding:3px 10px;border-radius:10px;font-size:0.65rem;font-weight:600;color:white;background:${CATEGORY_COLORS[person.category]};margin-bottom:4px;`;
    catBadge.textContent = person.category;
    card.appendChild(catBadge);

    // Role label
    const roleEl = document.createElement('div');
    roleEl.style.cssText = 'font-size:0.75rem;color:var(--text-dim);margin-bottom:12px;';
    roleEl.textContent = person.roleLabel;
    card.appendChild(roleEl);

    // Notes
    if (person.notes) {
      const notesEl = document.createElement('div');
      notesEl.style.cssText = 'font-size:0.72rem;color:var(--text);line-height:1.5;text-align:left;padding:10px;background:var(--bg-deep);border-radius:10px;margin-bottom:12px;';
      notesEl.textContent = person.notes;
      card.appendChild(notesEl);
    }

    // Action buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      resetForm(person);
      viewState = { mode: 'form', editingPerson: person };
      render();
    });
    btnRow.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-secondary';
    deleteBtn.style.cssText = 'color:var(--danger);border-color:var(--danger);';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (window.confirm(`Delete ${person.name} from the network?`)) {
        deps.dataStore.deleteRelationshipPerson(person.id);
        deps.onDataChange();
        // Refresh persons list and go back to network
        viewState = { mode: 'network' };
        renderRelationshipsView(container, deps);
      }
    });
    btnRow.appendChild(deleteBtn);

    card.appendChild(btnRow);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.style.cssText = 'margin-top:12px;width:100%;';
    backBtn.textContent = '← Back to Network';
    backBtn.addEventListener('click', () => {
      viewState = { mode: 'network' };
      render();
    });
    card.appendChild(backBtn);

    contentArea.appendChild(card);
  }

  function renderFormView(editingPerson: RelationshipPerson | null): void {
    const card = document.createElement('div');
    card.className = 'soft-card';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:14px;';
    title.textContent = editingPerson ? 'Edit Person' : 'Add Person';
    card.appendChild(title);

    // Name input
    const nameLabel = createLabel('Name');
    card.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Person\'s name';
    nameInput.value = formName;
    nameInput.style.cssText = inputStyle();
    nameInput.addEventListener('input', () => { formName = nameInput.value; });
    card.appendChild(nameInput);

    // Category picker
    const catLabel = createLabel('Category');
    card.appendChild(catLabel);
    const catRow = document.createElement('div');
    catRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button');
      const isSelected = formCategory === cat;
      btn.style.cssText = `padding:6px 12px;border-radius:14px;font-size:0.65rem;font-weight:600;cursor:pointer;border:2px solid ${CATEGORY_COLORS[cat]};background:${isSelected ? CATEGORY_COLORS[cat] : 'transparent'};color:${isSelected ? 'white' : CATEGORY_COLORS[cat]};`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        formCategory = cat;
        render();
      });
      catRow.appendChild(btn);
    }
    card.appendChild(catRow);

    // Role label dropdown with common options + custom entry
    const roleLabel = createLabel('Role Label');
    card.appendChild(roleLabel);

    const ROLE_OPTIONS = [
      '', 'Mom', 'Dad', 'Brother', 'Sister', 'Grandmother', 'Grandfather',
      'Aunt', 'Uncle', 'Cousin', 'Stepparent', 'Friend', 'Best Friend',
      'Nanny', 'Babysitter', 'Teacher', 'Tutor', 'OT', 'Speech Therapist',
      'Psychologist', 'Therapist', 'Pediatrician', 'Coach', 'Custom...',
    ];

    const isCustomValue = formRoleLabel !== '' && !ROLE_OPTIONS.includes(formRoleLabel);
    let showCustomInput = isCustomValue;

    const roleSelect = document.createElement('select');
    roleSelect.style.cssText = inputStyle();
    for (const opt of ROLE_OPTIONS) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt === '' ? 'Select a role...' : opt;
      roleSelect.appendChild(option);
    }
    // Pre-select the current value
    if (isCustomValue) {
      roleSelect.value = 'Custom...';
    } else {
      roleSelect.value = formRoleLabel;
    }

    const customInputContainer = document.createElement('div');
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = 'Enter custom role...';
    customInput.value = isCustomValue ? formRoleLabel : '';
    customInput.style.cssText = inputStyle();
    customInputContainer.appendChild(customInput);
    customInputContainer.style.display = showCustomInput ? 'block' : 'none';

    roleSelect.addEventListener('change', () => {
      const val = roleSelect.value;
      if (val === 'Custom...') {
        showCustomInput = true;
        customInputContainer.style.display = 'block';
        formRoleLabel = customInput.value;
        customInput.focus();
      } else {
        showCustomInput = false;
        customInputContainer.style.display = 'none';
        formRoleLabel = val;
      }
    });

    customInput.addEventListener('input', () => {
      formRoleLabel = customInput.value;
    });

    card.appendChild(roleSelect);
    card.appendChild(customInputContainer);

    // Notes textarea
    const notesLabel = createLabel('Notes');
    card.appendChild(notesLabel);
    const notesInput = document.createElement('textarea');
    notesInput.placeholder = 'Private notes about this person...';
    notesInput.value = formNotes;
    notesInput.style.cssText = inputStyle() + 'min-height:60px;resize:vertical;';
    notesInput.addEventListener('input', () => { formNotes = notesInput.value; });
    card.appendChild(notesInput);

    // Photo upload
    const photoLabel = createLabel('Photo');
    card.appendChild(photoLabel);

    const photoRow = document.createElement('div');
    photoRow.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:12px;';

    if (formPhotoBase64) {
      // Circular crop preview container with drag-to-reposition
      const previewContainer = document.createElement('div');
      previewContainer.style.cssText = 'width:160px;height:160px;border-radius:50%;overflow:hidden;border:3px solid var(--border);position:relative;cursor:grab;touch-action:none;';

      const previewImg = document.createElement('img');
      previewImg.src = formPhotoBase64;
      previewImg.draggable = false;
      previewImg.style.cssText = `width:100%;height:100%;object-fit:cover;transform:scale(${formPhotoZoom}) translate(${formPhotoPanX}px, ${formPhotoPanY}px);transition:none;pointer-events:none;`;
      previewContainer.appendChild(previewImg);

      // Drag-to-reposition handlers
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let panStartX = formPhotoPanX;
      let panStartY = formPhotoPanY;

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panStartX = formPhotoPanX;
        panStartY = formPhotoPanY;
        previewContainer.style.cursor = 'grabbing';
        previewContainer.setPointerCapture(e.pointerId);
        e.preventDefault();
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        // Divide by zoom so the drag distance maps to image pixels correctly
        const dx = (e.clientX - dragStartX) / formPhotoZoom;
        const dy = (e.clientY - dragStartY) / formPhotoZoom;
        formPhotoPanX = panStartX + dx;
        formPhotoPanY = panStartY + dy;
        previewImg.style.transform = `scale(${formPhotoZoom}) translate(${formPhotoPanX}px, ${formPhotoPanY}px)`;
      };

      const onPointerUp = (e: PointerEvent) => {
        isDragging = false;
        previewContainer.style.cursor = 'grab';
        previewContainer.releasePointerCapture(e.pointerId);
      };

      previewContainer.addEventListener('pointerdown', onPointerDown);
      previewContainer.addEventListener('pointermove', onPointerMove);
      previewContainer.addEventListener('pointerup', onPointerUp);
      previewContainer.addEventListener('pointercancel', onPointerUp);

      photoRow.appendChild(previewContainer);

      // Hint text
      const hintText = document.createElement('div');
      hintText.style.cssText = 'font-size:0.55rem;color:var(--text-muted);text-align:center;';
      hintText.textContent = 'Drag to reposition • Zoom to crop face';
      photoRow.appendChild(hintText);

      // Zoom slider
      const sliderRow = document.createElement('div');
      sliderRow.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;max-width:200px;';

      const zoomLabel = document.createElement('span');
      zoomLabel.style.cssText = 'font-size:0.6rem;color:var(--text-dim);white-space:nowrap;';
      zoomLabel.textContent = '🔍 Zoom';
      sliderRow.appendChild(zoomLabel);

      const zoomSlider = document.createElement('input');
      zoomSlider.type = 'range';
      zoomSlider.min = '1';
      zoomSlider.max = '3';
      zoomSlider.step = '0.1';
      zoomSlider.value = String(formPhotoZoom);
      zoomSlider.style.cssText = 'flex:1;cursor:pointer;';
      zoomSlider.addEventListener('input', () => {
        formPhotoZoom = parseFloat(zoomSlider.value);
        previewImg.style.transform = `scale(${formPhotoZoom}) translate(${formPhotoPanX}px, ${formPhotoPanY}px)`;
      });
      sliderRow.appendChild(zoomSlider);
      photoRow.appendChild(sliderRow);

      // Recenter + Remove buttons
      const btnRow2 = document.createElement('div');
      btnRow2.style.cssText = 'display:flex;gap:8px;';

      const recenterBtn = document.createElement('button');
      recenterBtn.className = 'btn-secondary';
      recenterBtn.style.cssText = 'font-size:0.6rem;padding:4px 10px;';
      recenterBtn.textContent = 'Recenter';
      recenterBtn.addEventListener('click', () => {
        formPhotoZoom = 1.0;
        formPhotoPanX = 0;
        formPhotoPanY = 0;
        zoomSlider.value = '1';
        previewImg.style.transform = 'scale(1) translate(0px, 0px)';
      });
      btnRow2.appendChild(recenterBtn);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-secondary';
      removeBtn.style.cssText = 'font-size:0.6rem;padding:4px 10px;color:var(--danger);';
      removeBtn.textContent = 'Remove Photo';
      removeBtn.addEventListener('click', () => {
        formPhotoBase64 = undefined;
        formPhotoZoom = 1.0;
        formPhotoPanX = 0;
        formPhotoPanY = 0;
        render();
      });
      btnRow2.appendChild(removeBtn);
      photoRow.appendChild(btnRow2);
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.jpg,.jpeg,.png';
      fileInput.style.cssText = 'font-size:0.65rem;';
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          formPhotoBase64 = reader.result as string;
          formPhotoZoom = 1.0;
          formPhotoPanX = 0;
          formPhotoPanY = 0;
          render();
        };
        reader.readAsDataURL(file);
      });
      photoRow.appendChild(fileInput);
    }
    card.appendChild(photoRow);

    // Save / Cancel buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.style.cssText = 'flex:1;';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      if (!formName.trim()) {
        nameInput.style.borderColor = 'var(--danger)';
        nameInput.focus();
        return;
      }

      const now = new Date();
      const roleValue = formRoleLabel.trim() || formCategory;

      // Apply crop/zoom to photo — ALWAYS compress to max 300x300 for storage efficiency
      const applyCroppedPhoto = (): Promise<string | undefined> => {
        if (!formPhotoBase64) return Promise.resolve(undefined);

        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Reduce canvas size to 200x200 for smaller file size (was 300x300)
            const canvasSize = 200;
            const canvas = document.createElement('canvas');
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext('2d')!;

            // Calculate draw dimensions: scale the image so it covers the canvas, then apply zoom
            const scale = Math.max(canvasSize / img.width, canvasSize / img.height) * formPhotoZoom;
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            // Apply pan offset (scale from 160px preview space to canvas space)
            const panScale = canvasSize / 160;
            const drawX = (canvasSize - drawWidth) / 2 + formPhotoPanX * panScale * formPhotoZoom;
            const drawY = (canvasSize - drawHeight) / 2 + formPhotoPanY * panScale * formPhotoZoom;

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            // Use JPEG at 0.6 quality for much smaller file size (was 0.8)
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.onerror = () => resolve(formPhotoBase64);
          img.src = formPhotoBase64!;
        });
      };

      applyCroppedPhoto().then((finalPhoto) => {
        if (editingPerson) {
          const updated: RelationshipPerson = {
            ...editingPerson,
            name: formName.trim(),
            category: formCategory,
            roleLabel: roleValue,
            notes: formNotes.trim() || undefined,
            photoBase64: finalPhoto,
            updatedAt: now,
          };
          deps.dataStore.saveRelationshipPerson(updated);
        } else {
          const newPerson: RelationshipPerson = {
            id: crypto.randomUUID(),
            childProfileId: profileId!,
            name: formName.trim(),
            category: formCategory,
            roleLabel: roleValue,
            notes: formNotes.trim() || undefined,
            photoBase64: finalPhoto,
            createdAt: now,
            updatedAt: now,
          };
          deps.dataStore.saveRelationshipPerson(newPerson);
        }

        deps.onDataChange();
        renderRelationshipsView(container, deps);
      });
    });
    btnRow.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.style.cssText = 'flex:1;';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      viewState = { mode: 'network' };
      render();
    });
    btnRow.appendChild(cancelBtn);

    card.appendChild(btnRow);
    contentArea.appendChild(card);
  }

  function resetForm(person: RelationshipPerson | null): void {
    if (person) {
      formName = person.name;
      formCategory = person.category;
      formRoleLabel = person.roleLabel;
      formNotes = person.notes || '';
      formPhotoBase64 = person.photoBase64;
      formPhotoZoom = 1.0;
      formPhotoPanX = 0;
      formPhotoPanY = 0;
    } else {
      formName = '';
      formCategory = 'Family';
      formRoleLabel = '';
      formNotes = '';
      formPhotoBase64 = undefined;
      formPhotoZoom = 1.0;
      formPhotoPanX = 0;
      formPhotoPanY = 0;
    }
  }

  // Initial render
  render();
}

function createLabel(text: string): HTMLElement {
  const label = document.createElement('div');
  label.style.cssText = 'font-size:0.68rem;font-weight:600;color:var(--text-dim);margin-bottom:4px;';
  label.textContent = text;
  return label;
}

function inputStyle(): string {
  return 'width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-input);font-size:0.75rem;margin-bottom:12px;background:var(--bg);color:var(--text);font-family:inherit;';
}
