# Circle Person Persistence Fix

## Issues Fixed

### 1. Person Not Persisting to Database
**Root Cause**: The `category` field was missing from the database schema, but the form was trying to save it.

**Files Modified**:
- `/mobile/services/database.ts`

**Changes**:

1. **Added `category` column to table schema** (line ~135):
```sql
CREATE TABLE IF NOT EXISTS relationship_persons (
  id TEXT PRIMARY KEY,
  child_profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,  -- ADDED THIS
  role TEXT NOT NULL,
  ...
);
```

2. **Updated INSERT statement** (line ~924):
```typescript
INSERT INTO relationship_persons 
  (id, child_profile_id, name, category, role, ...)  -- Added category
  VALUES (?, ?, ?, ?, ?, ...)
```

3. **Updated UPDATE statement** (line ~948):
```typescript
if (updates.category !== undefined) {
  fields.push('category = ?');
  values.push(updates.category);
}
```

4. **Updated row mapping** (line ~1108):
```typescript
private rowToRelationshipPerson(row: any): any {
  return {
    ...
    category: row.category,  // ADDED THIS
    ...
  };
}
```

### 2. Empty State Showing Too Early
**Root Cause**: The empty state was only showing when `persons.length === 0`, but the logic was checking filtered persons first.

**File Modified**:
- `/mobile/app/(tabs)/circle.tsx`

**Change** (line ~185):
```typescript
// BEFORE: Checked filteredPersons first
{filteredPersons.length > 0 ? (
  <CircleNetworkView ... />
) : persons.length > 0 ? (
  <Text>No people in this category</Text>
) : (
  renderEmpty()
)}

// AFTER: Check persons.length first
{persons.length === 0 ? (
  renderEmpty()  // Shows child photo + "Add your first person"
) : filteredPersons.length > 0 ? (
  <CircleNetworkView ... />
) : (
  <Text>No people in this category</Text>
)}
```

## What This Fixes

1. **Person Persistence**: When you add a person (like "Dad") with a photo, it will now save correctly to the database and persist after navigating away and back.

2. **Empty State Display**: The "Add your first person" message (along with the child's central photo) will now show when there are 0 people in the circle, regardless of which category filter is selected.

## Testing

1. **Test Person Persistence**:
   - Add a new person (e.g., "Dad") with a photo
   - Navigate away from Circle tab
   - Navigate back to Circle tab
   - Verify the person appears in the network

2. **Test Empty State**:
   - Delete all people from Circle (if any exist)
   - Verify you see:
     - Child's photo in the center (large, 180px diameter)
     - "Add your first person" message below
     - "Add the people in..." description text
   - Add one person
   - Verify the empty state disappears and the network view shows

## Important Note

**Database Migration**: Since we added a new column to an existing table, users who already have the app installed will need the database to be recreated or migrated. The `CREATE TABLE IF NOT EXISTS` statement won't add the column to existing tables.

**For testing**: You may need to:
1. Uninstall the app from your phone
2. Reinstall it
3. Or manually delete the app's data/cache

This will ensure the database is created with the new schema including the `category` column.
