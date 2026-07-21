# Circle Photo Fixes - Mobile App

## Issues Fixed

1. **Center photo WAY too small**
   - Was: 50px radius (100px diameter)
   - Now: **90px radius (180px diameter)**
   - Almost 2x larger!

2. **Empty state center photo also too small**
   - Was: 100px diameter
   - Now: **180px diameter**
   - Placeholder emoji increased from 48pt to 72pt

3. **Empty state message**
   - Changed from "Add your first person" to "Add a person"

## Files Modified

### 1. `/mobile/components/CircleNetworkView.tsx`

**Line 28 - Center radius:**
```typescript
// BEFORE
const CENTER_RADIUS = 50;

// AFTER
const CENTER_RADIUS = 90; // Large prominent center photo (180px diameter)
```

**Lines 78-85 - Orbit radius calculation:**
```typescript
// BEFORE
const minOrbitForNoOverlap = count > 1
  ? minChord / (2 * Math.sin(Math.PI / count))
  : 130;
const orbitRadius = Math.max(130, Math.min(220, minOrbitForNoOverlap));

// AFTER
const minOrbitForNoOverlap = count > 1
  ? minChord / (2 * Math.sin(Math.PI / count))
  : 150; // single person: place at 150px from center

// Ensure orbit is far enough from the larger center (90px radius + 30px gap minimum)
const minOrbitFromCenter = CENTER_RADIUS + 30 + maxNodeRadius;
const orbitRadius = Math.max(minOrbitFromCenter, Math.min(240, minOrbitForNoOverlap));
```

### 2. `/mobile/app/(tabs)/circle.tsx`

**Lines 238-252 - Empty state photo size:**
```typescript
// BEFORE
centralPhotoCircle: {
  width: 100,
  height: 100,
  borderRadius: 50,
  ...
}
centralPhotoPlaceholder: {
  fontSize: 48,
}

// AFTER
centralPhotoCircle: {
  width: 180,
  height: 180,
  borderRadius: 90,
  ...
}
centralPhotoPlaceholder: {
  fontSize: 72,
}
```

**Line 152 - Empty state message:**
```typescript
// BEFORE
Add your first person

// AFTER
Add a person
```

## Size Comparison

- **Header photo** (top right): 64px diameter
- **Center photo** (main Circle): **180px diameter** (2.8x larger!)
- **Person nodes**: 56-72px diameter depending on category

## Testing

The changes should be visible immediately after the app reloads. The center photo should now be dramatically larger and much more prominent than before.

If you don't see the changes:
1. Make sure you're running the mobile app (not the web app)
2. Try force-closing and reopening the app
3. Check that the Expo dev server reloaded the changes
