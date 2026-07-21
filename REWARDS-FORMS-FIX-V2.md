# Rewards Forms Navigation Fix v2

## Problem
After creating the behavior-form and reward-form screens, navigation worked but caused a render error:
```
Element type is invalid, expected a string (for built-in components) or a class/function (for composite components) but got: undefined.
```

## Root Cause
The form screens were trying to use `useRewards()` hook, but they were outside the `RewardsProvider` context. The `RewardsProvider` is only available within the `/(tabs)/rewards` route, not at the root app level.

## Solution

### 1. Created Route Group with Provider

Created `/(rewards-forms)/` route group with its own layout that wraps all form screens with `RewardsProvider`:

**`mobile/app/(rewards-forms)/_layout.tsx`**
```typescript
export default function RewardsFormsLayout() {
  return (
    <RewardsProvider>
      <Stack screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}>
        <Stack.Screen name="behavior-form" />
        <Stack.Screen name="reward-form" />
      </Stack>
    </RewardsProvider>
  );
}
```

### 2. Moved Form Screens into Route Group

- Moved `behavior-form.tsx` → `(rewards-forms)/behavior-form.tsx`
- Moved `reward-form.tsx` → `(rewards-forms)/reward-form.tsx`

### 3. Updated Form Screens to Use Context

Both screens now properly use `useRewards()` hook to:
- Get `behaviors` and `rewards` arrays
- Get `selectedChildProfileId`
- Call `createBehavior`, `updateBehavior`, `createReward`, `updateReward` methods

**Example (behavior-form.tsx):**
```typescript
const { createBehavior, updateBehavior, behaviors, selectedChildProfileId } = useRewards();

const handleSave = async (input: any) => {
  if (behaviorId && behavior) {
    await updateBehavior(behaviorId, input);
  } else {
    await createBehavior(input);
  }
  router.back();
};
```

### 4. Updated Navigation Paths

Updated `RewardsTabScreen.tsx` to use the new grouped routes:
```typescript
const handleAddBehavior = () => {
  router.push('/(rewards-forms)/behavior-form');
};

const handleAddReward = () => {
  router.push('/(rewards-forms)/reward-form');
};
```

## File Structure

```
mobile/app/
├── (tabs)/
│   └── rewards.tsx  ← RewardsProvider here
└── (rewards-forms)/  ← NEW: Route group
    ├── _layout.tsx  ← RewardsProvider wrapper
    ├── behavior-form.tsx  ← Can use useRewards()
    └── reward-form.tsx  ← Can use useRewards()
```

## Benefits

1. **Proper Context Access** - Forms have access to RewardsContext
2. **Modal Presentation** - Forms slide up from bottom like a modal
3. **Clean Separation** - Rewards-related screens are grouped together
4. **Reusable Pattern** - Can add more rewards screens to this group

## Testing

1. ✅ Navigate to Rewards tab
2. ✅ Tap "Add First Behavior"
3. ✅ Form screen loads without render error
4. ✅ Can fill out form fields
5. ✅ Can save behavior (creates new behavior)
6. ✅ Can cancel (navigates back)
7. ✅ Same for "Add First Reward"

## Files Created
- `/mobile/app/(rewards-forms)/_layout.tsx`

## Files Moved
- `/mobile/app/behavior-form.tsx` → `/mobile/app/(rewards-forms)/behavior-form.tsx`
- `/mobile/app/reward-form.tsx` → `/mobile/app/(rewards-forms)/reward-form.tsx`

## Files Modified
- `/mobile/app/(rewards-forms)/behavior-form.tsx` - Updated to use context properly
- `/mobile/app/(rewards-forms)/reward-form.tsx` - Updated to use context properly
- `/mobile/components/RewardsTabScreen.tsx` - Updated navigation paths

## Status

✅ **FIXED** - Forms now load properly with full context access
