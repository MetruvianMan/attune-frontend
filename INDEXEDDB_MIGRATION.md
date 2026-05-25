# IndexedDB Migration - Persistence Fix

## Problem
The app was experiencing `QuotaExceededError` when trying to save data to localStorage, even with relatively small data sizes (~311KB). This prevented events and other data from persisting after page refresh.

## Root Cause
- localStorage has a strict 5-10MB limit across all data for a domain
- Safari and some mobile browsers are even more restrictive
- The limit is shared across ALL localStorage keys, including photos stored separately
- Even after clearing conversations and photos, the quota error persisted

## Solution
Migrated from localStorage to IndexedDB, which provides:
- **Much larger storage capacity**: 50-100MB minimum (often hundreds of MB)
- **Better mobile support**: Works reliably on both web and mobile browsers
- **Automatic migration**: Existing localStorage data is automatically migrated on first load
- **Backward compatibility**: Photos stored in localStorage are preserved

## Changes Made

### 1. IndexedDB Store (`src/data-store/indexed-db-store.ts`)
- Created wrapper class for IndexedDB operations
- Provides `initialize()`, `save()`, `load()`, and `clear()` methods
- Uses object store named 'app-data' in database 'attune-app-db'

### 2. InMemoryDataStore (`src/data-store/in-memory-data-store.ts`)
- Added `initialize()` method to set up IndexedDB before use
- Updated `persistToLocalStorage()` to save to IndexedDB (async)
- Updated `loadFromLocalStorage()` to load from IndexedDB with automatic migration from localStorage
- Added `clearAllData()` method to clear all storage (IndexedDB + localStorage)
- Photos are still stored separately in localStorage but excluded from main data blob

### 3. App Shell (`src/ui/app-shell.ts`)
- Made `initAppShell()` async to await IndexedDB initialization
- Updated `persistState()` to handle async persistence (fire-and-forget)
- Added error handling for initialization failures

### 4. App Entry Point (`src/app.ts`)
- Updated to await `initAppShell()` with error handling

### 5. Profile Management View (`src/ui/profile-management-view.ts`)
- Updated "Clear Chats" button to use async persistence
- Updated "Check Storage" button to check IndexedDB (with localStorage fallback)
- Shows IndexedDB storage limits in the UI

## Migration Process

When the app loads:
1. IndexedDB is initialized first
2. App tries to load data from IndexedDB
3. If no data in IndexedDB, it checks localStorage
4. If data found in localStorage:
   - Data is loaded into memory
   - Data is saved to IndexedDB
   - localStorage is cleared to free up space
   - User sees "[MIGRATION] ✅ Migration complete" in console
5. All future saves go to IndexedDB

## Testing Instructions

### 1. Fresh Start (No Existing Data)
```bash
cd /Users/robertpassberger/~:Projects:attune-app
npm run dev
```
- Open browser to http://localhost:5173
- Create a profile
- Add some events
- Refresh the page
- Events should persist ✅

### 2. Migration from localStorage
If you have existing data in localStorage:
- Open browser to http://localhost:5173
- Check browser console for migration messages
- Should see: "[MIGRATION] Found data in localStorage, migrating to IndexedDB..."
- Should see: "[MIGRATION] ✅ Migration complete"
- All your data should be preserved
- Refresh the page to verify persistence

### 3. Verify Storage
- Go to Profile tab
- Click "📊 Check Storage" button
- Should show IndexedDB storage with breakdown
- Should show "IndexedDB limit: ~50-100MB" (much larger than localStorage)

### 4. Check Browser DevTools
**Chrome/Edge:**
- Open DevTools (F12)
- Go to Application tab
- Expand "IndexedDB" in left sidebar
- Should see "attune-app-db" database
- Click on "app-data" object store
- Should see your data stored there

**Firefox:**
- Open DevTools (F12)
- Go to Storage tab
- Expand "IndexedDB" in left sidebar
- Should see "attune-app-db"

**Safari:**
- Open Web Inspector (Cmd+Option+I)
- Go to Storage tab
- Should see IndexedDB section

## Console Messages to Look For

### Successful Migration
```
[LOAD] No data in IndexedDB, checking localStorage for migration...
[MIGRATION] Found data in localStorage, migrating to IndexedDB...
[MIGRATION] Data migrated to IndexedDB successfully
[MIGRATION] Cleared localStorage
[MIGRATION] ✅ Migration complete - data loaded from localStorage and saved to IndexedDB
```

### Normal Load (After Migration)
```
[DataStore] IndexedDB initialized
[LOAD] ✅ Data loaded from IndexedDB
```

### Successful Save
```
[PERSIST] ✅ Success (IndexedDB): 45.3 KB
```

## Troubleshooting

### Events Still Not Persisting
1. Check browser console for errors
2. Verify IndexedDB is supported: `console.log('indexedDB' in window)`
3. Check if IndexedDB is disabled in browser settings
4. Try in incognito/private mode to rule out extensions

### Migration Failed
1. Check console for error messages
2. Manually export data using "💾 Export Data" button
3. Clear all storage and import data back

### Storage Still Full
1. Click "📊 Check Storage" to see breakdown
2. Use "💬 Clear Chats" to remove conversation history
3. Delete unused photos from Circle
4. Export data, clear all, and import back

## Benefits

✅ **No more QuotaExceededError**: IndexedDB has 10-20x more space
✅ **Better mobile support**: Works reliably on iOS and Android
✅ **Automatic migration**: No manual steps required
✅ **Backward compatible**: Existing data is preserved
✅ **Future-proof**: Room to grow as you add more data

## Next Steps

After verifying the migration works:
1. Test adding multiple events and refreshing
2. Test with photos in Circle
3. Test on mobile device (if available)
4. Consider adding periodic backup reminders
5. Consider adding storage usage indicator in UI
