/**
 * One-time storage cleanup script
 * 
 * Run this in the browser console to manually clean up localStorage
 * and remove all photos to free up space.
 * 
 * INSTRUCTIONS:
 * 1. Open the app in your browser
 * 2. Open Developer Tools (F12 or Cmd+Option+I)
 * 3. Go to the Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run it
 * 6. Refresh the page
 */

(function cleanupStorage() {
  console.log('=== ATTUNE STORAGE CLEANUP ===');
  
  try {
    // Get current data
    const raw = localStorage.getItem('attune-app-data');
    if (!raw) {
      console.log('No data found in localStorage');
      return;
    }
    
    const data = JSON.parse(raw);
    
    // Show current size
    const currentSize = raw.length;
    console.log(`Current storage size: ${(currentSize / 1024).toFixed(1)}KB (${(currentSize / (1024 * 1024)).toFixed(2)}MB)`);
    
    // Count and remove photos
    let photoCount = 0;
    let totalPhotoSize = 0;
    
    if (data.relationshipPersons) {
      data.relationshipPersons = data.relationshipPersons.map(([id, person]) => {
        if (person.photoBase64) {
          photoCount++;
          totalPhotoSize += person.photoBase64.length;
          console.log(`Removing photo from ${person.name}: ${(person.photoBase64.length / 1024).toFixed(1)}KB`);
          return [id, { ...person, photoBase64: undefined }];
        }
        return [id, person];
      });
    }
    
    console.log(`\nRemoved ${photoCount} photos totaling ${(totalPhotoSize / 1024).toFixed(1)}KB`);
    
    // Save cleaned data
    const cleanedData = JSON.stringify(data);
    const newSize = cleanedData.length;
    console.log(`New storage size: ${(newSize / 1024).toFixed(1)}KB (${(newSize / (1024 * 1024)).toFixed(2)}MB)`);
    console.log(`Space freed: ${((currentSize - newSize) / 1024).toFixed(1)}KB`);
    
    localStorage.setItem('attune-app-data', cleanedData);
    localStorage.setItem('attune-migration-done', 'true');
    
    console.log('\n✅ Cleanup complete! Refresh the page to continue.');
    console.log('You can now re-upload photos - they will be compressed to ~20-30KB each.');
    
  } catch (e) {
    console.error('❌ Cleanup failed:', e);
    console.log('\nIf cleanup failed, you may need to clear ALL localStorage:');
    console.log('Run: localStorage.clear()');
    console.log('WARNING: This will delete all your app data!');
  }
})();
