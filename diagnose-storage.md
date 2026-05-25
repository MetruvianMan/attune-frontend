# Storage Diagnosis

Run this in the browser console to see what's really happening:

```javascript
// 1. Check ALL localStorage items
console.log('=== ALL LOCALSTORAGE ITEMS ===');
let totalSize = 0;
const items = [];

for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    const size = value ? value.length : 0;
    totalSize += size;
    items.push({ key, size });
  }
}

items.sort((a, b) => b.size - a.size);

console.log(`Total items: ${items.length}`);
console.log(`Total size: ${(totalSize / 1024).toFixed(1)}KB (${(totalSize / (1024 * 1024)).toFixed(2)}MB)`);

items.forEach(item => {
  const sizeKB = (item.size / 1024).toFixed(1);
  const percent = ((item.size / totalSize) * 100).toFixed(1);
  console.log(`  ${item.key}: ${sizeKB}KB (${percent}%)`);
});

// 2. Test if we can actually write to localStorage
console.log('\n=== WRITE TEST ===');
try {
  const testData = 'x'.repeat(1000); // 1KB test
  localStorage.setItem('test-write', testData);
  console.log('✅ Can write 1KB');
  localStorage.removeItem('test-write');
  
  const bigTestData = 'x'.repeat(100000); // 100KB test
  localStorage.setItem('test-write', bigTestData);
  console.log('✅ Can write 100KB');
  localStorage.removeItem('test-write');
} catch (e) {
  console.error('❌ Cannot write to localStorage:', e);
}

// 3. Check the main app data
console.log('\n=== APP DATA ===');
const appData = localStorage.getItem('attune-app-data');
if (appData) {
  const parsed = JSON.parse(appData);
  console.log('Events count:', parsed.events?.length || 0);
  console.log('Conversations count:', parsed.conversationSessions?.length || 0);
  console.log('Documents count:', parsed.archivedDocuments?.length || 0);
}
```

This will tell us:
1. What's REALLY in localStorage (including items outside the app)
2. If we can actually write to localStorage at all
3. What's in your app data

Please run this and share the output!
