# Emergency Storage Cleanup

Your localStorage is completely full and nothing can save. Follow these steps:

## Option 1: Quick Fix (Recommended)

1. Open the app in your browser
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Go to the **Console** tab
4. Copy and paste this command and press Enter:

```javascript
// Check current size
const raw = localStorage.getItem('attune-app-data');
console.log('Current size:', (raw.length / 1024).toFixed(1) + 'KB');

// Parse and clean
const data = JSON.parse(raw);

// Remove ALL photos
if (data.relationshipPersons) {
  data.relationshipPersons = data.relationshipPersons.map(([id, person]) => {
    if (person.photoBase64) {
      console.log('Removing photo from', person.name);
      return [id, { ...person, photoBase64: undefined }];
    }
    return [id, person];
  });
}

// Save cleaned data
const cleaned = JSON.stringify(data);
console.log('New size:', (cleaned.length / 1024).toFixed(1) + 'KB');
localStorage.setItem('attune-app-data', cleaned);
console.log('✅ Cleanup complete! Refresh the page.');
```

5. Refresh the page (Cmd+R)
6. Try adding an event again

## Option 2: Nuclear Option (If Option 1 Fails)

**WARNING: This will delete ALL your app data!**

1. Open Developer Tools Console
2. Run: `localStorage.clear()`
3. Refresh the page
4. Start fresh

## Option 3: Check What's Taking Up Space

Run this in the console to see what's using storage:

```javascript
const raw = localStorage.getItem('attune-app-data');
const data = JSON.parse(raw);

const sizes = {};
for (const [key, value] of Object.entries(data)) {
  sizes[key] = JSON.stringify(value).length;
}

console.table(
  Object.entries(sizes)
    .sort((a, b) => b[1] - a[1])
    .map(([key, size]) => ({
      Category: key,
      'Size (KB)': (size / 1024).toFixed(1),
      'Percentage': ((size / raw.length) * 100).toFixed(1) + '%'
    }))
);
```

This will show you if events, diary entries, or something else is taking up space.
