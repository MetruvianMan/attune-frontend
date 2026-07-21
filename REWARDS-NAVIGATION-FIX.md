# Rewards Tab Navigation Fix

## Problem
The "Add First Behavior" and "Add First Reward" buttons in the Rewards tab empty state were logging to console but not navigating anywhere, resulting in no UI response.

## Root Cause
The navigation handlers in `RewardsTabScreen.tsx` were TODO stubs that only logged to console:
```typescript
const handleAddBehavior = () => {
  // TODO: Navigate to behavior creation screen
  console.log('Navigate to add behavior');
};
```

## Solution

### 1. Created Navigation Screens

**`mobile/app/behavior-form.tsx`**
- Full-screen route for creating/editing behaviors
- Wraps `BehaviorFormModal` component
- Supports optional `behaviorId` query param for editing

**`mobile/app/reward-form.tsx`**
- Full-screen route for creating/editing rewards  
- Wraps `RewardFormModal` component
- Supports optional `rewardId` query param for editing

### 2. Updated Navigation Handlers

Updated `RewardsTabScreen.tsx` to use actual navigation:
```typescript
const handleAddBehavior = () => {
  router.push('/behavior-form');
};

const handleAddReward = () => {
  router.push('/reward-form');
};
```

## Testing

1. **Open Rewards tab** - Should see empty state with buttons
2. **Tap "Add First Behavior"** - Should navigate to behavior creation form
3. **Tap "Add First Reward"** - Should navigate to reward creation form
4. **Complete the forms** - Should create behavior/reward and navigate back

## Files Modified

- **Created:** `mobile/app/behavior-form.tsx`
- **Created:** `mobile/app/reward-form.tsx`  
- **Modified:** `mobile/components/RewardsTabScreen.tsx`

## Navigation Structure

```
/(tabs)/rewards → RewardsTabScreen
                 ├─ Empty State
                 │  ├─ "Add First Behavior" → /behavior-form
                 │  └─ "Add First Reward" → /reward-form
                 └─ Main View (when data exists)
                    ├─ Quick Actions
                    │  ├─ "Earn Points" → (TODO)
                    │  └─ "Redeem Reward" → (TODO)
                    └─ Recent Activity
                       └─ "View Full Ledger" → (TODO)
```

## Still TODO

The following navigation handlers are still placeholders:
- `handleEarnPoints()` - Should show quick log or behaviors view
- `handleRedeemReward()` - Should show catalog/redemption interface
- `handleViewFullLedger()` - Should show full ledger view
- `handleEventPress()` - Should show point event detail

These will be implemented when the corresponding screens are ready.

## Status

✅ **FIXED** - Navigation to behavior and reward forms now works
