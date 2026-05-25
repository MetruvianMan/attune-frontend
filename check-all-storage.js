/**
 * Check ALL localStorage items, not just the main data
 * 
 * Run this in the browser console to see everything in localStorage
 */

(function checkAllStorage() {
  console.log('=== ALL LOCALSTORAGE ITEMS ===\n');
  
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
  
  // Sort by size
  items.sort((a, b) => b.size - a.size);
  
  console.log(`Total items: ${items.length}`);
  console.log(`Total size: ${(totalSize / 1024).toFixed(1)}KB (${(totalSize / (1024 * 1024)).toFixed(2)}MB)\n`);
  
  console.log('Breakdown by item:');
  items.forEach(item => {
    const sizeKB = (item.size / 1024).toFixed(1);
    const percent = ((item.size / totalSize) * 100).toFixed(1);
    console.log(`  ${item.key}: ${sizeKB}KB (${percent}%)`);
  });
  
  console.log('\n=== RECOMMENDATION ===');
  if (totalSize > 5 * 1024 * 1024) {
    console.log('⚠️ Storage is over 5MB! This is near the browser limit.');
    console.log('Consider clearing large items or old data.');
  } else {
    console.log('✅ Storage usage looks normal.');
    console.log('The QuotaExceededError might be a browser-specific issue.');
  }
})();
