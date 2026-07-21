# Circle Photo Persistence Fixes - Updated

## Issues Identified

1. **Photos not persisting to Circle page after adding a person**
   - Root cause: Photos were being stripped from the main data blob when saving to IndexedDB (for space efficiency)
   - Photos stored separately in localStorage with key `attune-person-photo-${person.id}`
   - The `getRelationshipPersons()` method had a conditional check that only restored photos if `photoBase64` was undefined
   - However, after a page reload, the person object might have `photoBase64: undefined` explicitly set, causing the conditional to fail

2. **Center photo WAY too small**
   - `CENTER_RADIUS` was set to 40px (80px diameter)
   - Header photo in top right is 64px diameter
   - Center photo should be MUCH larger as the focal point
   - **Increased to 90px radius = 180px diameter** (almost 3x larger than header)

3. **"Add a person" empty state message**
   - Changed from "Add your first person" to "Add a person" with 👥 emoji
   - This only shows when no people have been added yet

4. **Camera emoji not appearing in Profile view before photo upload**
   - Profile card was showing person emoji (👤) instead of camera emoji (📷)
   - Changed to camera emoji to indicate photo can be added
   - Added click handler to open edit form when clicking the photo area

## Fixes Applied

### 1. Photo Persistence Fix (`src/data-store/in-memory-data-store.ts`)

**Changed `getRelationshipPersons()` method:**
```typescript
// BEFORE: Only restored photo if photoBase64 was falsy
if (!p.photoBase64) {
  const photo = localStorage.getItem(`attune-person-photo-${p.id}`);
  if (photo) {
    p.photoBase64 = photo;
  }
}

// AFTER: Always restore photo from localStorage
const photo = localStorage.getItem(`attune-person-photo-${p.id}`);
if (photo) {
  p.photoBase64 = photo;
}
```

**Changed `getRelationshipPerson()` method:**
```typescript
// BEFORE: Only restored photo if person existed AND photoBase64 was falsy
if (person && !person.photoBase64) {
  const photo = localStorage.getItem(`attune-person-photo-${id}`);
  if (photo) {
    person.photoBase64 = photo;
  }
}

// AFTER: Always restore photo if person exists
if (person) {
  const photo = localStorage.getItem(`attune-person-photo-${id}`);
  if (photo) {
    person.photoBase64 = photo;
  }
}
```

### 2. Center Photo Size Fix (`src/ui/network-layout.ts`)

```typescript
// BEFORE
const CENTER_RADIUS = 40; // 80px diameter

// AFTER
const CENTER_RADIUS = 90; // 180px diameter - large prominent center photo
```

**Also updated orbit radius calculation:**
```typescript
// BEFORE: orbit capped at 130-220px
const orbitRadius = Math.max(130, Math.min(220, minOrbitForNoOverlap));

// AFTER: orbit adjusted for larger center (90px + 30px gap + node radius)
const minOrbitFromCenter = CENTER_RADIUS + 30 + maxNodeRadius;
const orbitRadius = Math.max(minOrbitFromCenter, Math.min(240, minOrbitForNoOverlap));
```

### 3. Empty State Message Fix (`src/ui/relationships-view.ts`)

```typescript
// BEFORE
<div class="placeholder-title">Add your first person</div>

// AFTER
<div class="placeholder-title">Add a person</div>
```

### 4. Camera Emoji Fix (`src/ui/profile-management-view.ts`)

```typescript
// BEFORE: Showed person emoji
cardPhoto.textContent = '👤';

// AFTER: Shows camera emoji and is clickable
cardPhoto.textContent = '📷'; // Camera emoji to indicate photo can be added
cardPhoto.style.cursor = 'pointer';
cardPhoto.addEventListener('click', () => {
  renderEditForm(profile);
});
```

## Size Comparison

- **Header photo** (top right): 64px diameter
- **Center photo** (main Circle): **180px diameter** (2.8x larger)
- **Person nodes**: 48-64px diameter depending on category

The center photo is now the dominant visual element, as it should be.

## Testing Instructions

1. **Test Photo Persistence:**
   - Add a person to Circle with a photo
   - Verify photo appears in the person creation form
   - Save the person
   - Verify photo appears on the main Circle page
   - Refresh the page (F5)
   - Verify photo still appears on the Circle page

2. **Test Center Photo Size:**
   - Navigate to Circle page
   - Verify the center photo (child's profile photo) is MUCH larger than the header photo
   - Should be 180px diameter (90px radius)
   - Should be the dominant visual element

3. **Test Empty State:**
   - Delete all people from Circle
   - Verify "Add a person" message appears with 👥 emoji
   - Verify "+ Add Person" button is visible

4. **Test Camera Emoji:**
   - Navigate to Profile tab
   - Create a new child profile WITHOUT uploading a photo
   - Verify camera emoji (📷) appears in the profile card
   - Click the camera emoji
   - Verify it opens the edit form
   - Verify camera emoji also appears in the edit form photo preview area

## Files Modified

1. `/Users/robertpassberger/~:Projects:attune-app/src/data-store/in-memory-data-store.ts`
   - Lines 437-445: `getRelationshipPerson()` method
   - Lines 448-459: `getRelationshipPersons()` method

2. `/Users/robertpassberger/~:Projects:attune-app/src/ui/network-layout.ts`
   - Line 22: `CENTER_RADIUS` constant (40 → 90)
   - Lines 92-96: Orbit radius calculation updated

3. `/Users/robertpassberger/~:Projects:attune-app/src/ui/relationships-view.ts`
   - Line 89: Empty state title text

4. `/Users/robertpassberger/~:Projects:attune-app/src/ui/profile-management-view.ts`
   - Lines 116-132: Profile card photo rendering
