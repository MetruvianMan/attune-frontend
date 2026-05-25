// Quick test to check if photoBase64 is being saved
const testData = {
  relationshipPersons: [
    ['test-id', {
      id: 'test-id',
      childProfileId: 'child-1',
      name: 'Test Person',
      category: 'Family',
      roleLabel: 'Mom',
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  ]
};

console.log('Original data:');
console.log(JSON.stringify(testData, null, 2));

const serialized = JSON.stringify(testData);
console.log('\nSerialized length:', serialized.length);

const deserialized = JSON.parse(serialized);
console.log('\nDeserialized photoBase64:', deserialized.relationshipPersons[0][1].photoBase64);
