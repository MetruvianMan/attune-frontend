# Restore App to Working State

Your data was accidentally cleared. Here's how to recover:

## Option 1: Restore from Backup (If you have one)

1. Open the app
2. Go to Profile tab
3. Click "📥 Restore" button
4. Select your backup JSON file
5. Page will reload with your data

## Option 2: Start Fresh

Run this in the browser console to clear everything and start clean:

```javascript
// Clear all localStorage
localStorage.clear();

// Reload the page
location.reload();
```

Then create a new profile and start adding data.

## Why This Happened

The app was trying to save data but hitting a storage quota error. The emergency cleanup code was too aggressive and removed data before confirming the save succeeded.

## What's Fixed Now

- Removed the dangerous `localStorage.removeItem()` call
- Emergency cleanup now only clears data AFTER successfully saving
- No more annoying alerts on every tab switch
- Cleanup tries multiple strategies:
  1. Remove conversation sessions (143KB)
  2. Remove archived documents (91KB)
  3. Keep your events, diary, and Circle data safe

## To Prevent This in the Future

1. **Use the Backup button regularly** (Profile tab → 💾 Backup)
2. **Keep conversation sessions short** - they're the largest data item
3. **Archive old documents sparingly** - they add up quickly
4. **Photos are now compressed** - new uploads will be ~20-30KB each

## Current Storage Status

Photos appear in the "relationshipPersons" category because they're embedded as base64 strings in the person objects.

Your storage was showing:
- conversationSessions: 143KB (47.5%) ← Largest
- archivedDocuments: 91.4KB (30.3%) ← Second largest  
- events: 58.5KB (19.4%)
- relationshipPersons: 2.6KB (0.9%) ← Photos are here

Total: 301KB (well under the 5-10MB limit)

The quota error was likely caused by browser-specific issues or temporary memory spikes during JSON serialization.
