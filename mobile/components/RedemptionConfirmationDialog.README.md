# RedemptionConfirmationDialog Component

## Overview

`RedemptionConfirmationDialog` is a modal dialog component that handles the complete reward redemption flow in the Attune Rewards system. It displays reward details, validates point balance, handles parent approval flow, and provides a 5-second undo window after successful redemption.

## Features

- **Reward Display**: Shows reward emoji, title, and point cost prominently
- **Balance Tracking**: Displays current balance and projected balance after redemption
- **Parent Approval Flow**: Conditional UI showing "Approve/Deny" or "Confirm/Cancel" buttons based on `parentApprovalRequired` flag
- **Validation**: Checks if point balance is sufficient before allowing redemption
- **Success Feedback**: Shows celebration animation with new balance after redemption
- **Undo Mechanism**: Provides 5-second countdown timer to reverse redemption
- **Error Handling**: Clear error messages for insufficient points or failed redemptions

## Requirements Covered

### From Requirements Document

- **14.2**: Display reward details and point cost
- **14.3**: Show current balance and balance after redemption
- **14.4**: Support parent approval flow when required
- **14.5**: Show undo button for 5 seconds after redemption
- **14.6**: Show "Approve" and "Deny" buttons when `parentApprovalRequired` is true
- **15.1**: Show "Confirm" and "Cancel" buttons when no approval required
- **15.2**: After successful redemption, show success message with undo button for 5 seconds
- **15.3**: Integrate with RewardsContext redeemReward action
- **15.4**: Integrate with UndoManager for 5-second undo window

### Task Reference

**Task 10.4**: Create RedemptionConfirmationDialog component

## Props

```typescript
interface RedemptionConfirmationDialogProps {
  visible: boolean;           // Controls dialog visibility
  onClose: () => void;        // Callback when dialog should close
  reward: Reward | null;      // The reward to be redeemed (null when hidden)
}
```

## States

The dialog has four main states:

1. **confirm**: Initial state showing reward details and confirmation buttons
2. **redeeming**: Loading state while redemption is processing
3. **success**: Success state with undo button and countdown timer
4. **error**: Error state showing error message and reason

## Usage Example

```typescript
import { RedemptionConfirmationDialog } from './components/RedemptionConfirmationDialog';
import { Reward } from './models/reward';

function CatalogView() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const handleRewardPress = (reward: Reward) => {
    setSelectedReward(reward);
    setDialogVisible(true);
  };

  const handleCloseDialog = () => {
    setDialogVisible(false);
    setSelectedReward(null);
  };

  return (
    <>
      {/* Your catalog view content */}
      
      <RedemptionConfirmationDialog
        visible={dialogVisible}
        onClose={handleCloseDialog}
        reward={selectedReward}
      />
    </>
  );
}
```

## Context Dependencies

### RewardsContext

The component relies on the following from `RewardsContext`:

- `pointBalance`: Current point balance for balance checks
- `redeemReward(rewardId)`: Function to execute redemption
- `undoPointEvent(eventId)`: Function to undo redemption
- `loading`: Loading state indicator
- `error`: Error message from context

## UI Flow

### Confirm State (Parent Approval Required)

```
┌─────────────────────────────────────┐
│           🎁                        │
│      Ice cream trip                 │
│                                     │
│  ╭───────────────────────────────╮  │
│  │       Point Cost               │  │
│  │       20 pts                   │  │
│  ╰───────────────────────────────╯  │
│                                     │
│  Current Balance:        125 pts   │
│  After Redemption:       105 pts   │
│                                     │
│  🔒 This reward requires parent     │
│     approval                        │
│                                     │
│  ┌─────────┐  ┌──────────────┐    │
│  │  Deny   │  │   Approve    │    │
│  └─────────┘  └──────────────┘    │
└─────────────────────────────────────┘
```

### Success State with Undo

```
┌─────────────────────────────────────┐
│           🎉                        │
│    Reward Redeemed!                 │
│                                     │
│           🎁                        │
│      Ice cream trip                 │
│                                     │
│  ╭───────────────────────────────╮  │
│  │      New Balance               │  │
│  │       105 pts                  │  │
│  ╰───────────────────────────────╯  │
│                                     │
│  ┌────────────────────────────┐    │
│  │  ↩️ Undo (5s)               │    │
│  └────────────────────────────┘    │
│  Tap to reverse this redemption    │
│                                     │
│          [Close]                    │
└─────────────────────────────────────┘
```

### Error State (Insufficient Points)

```
┌─────────────────────────────────────┐
│           ⚠️                        │
│     Unable to Redeem                │
│                                     │
│  ╭───────────────────────────────╮  │
│  │  Insufficient points. Need     │  │
│  │  20, have 15.                  │  │
│  ╰───────────────────────────────╯  │
│                                     │
│           🎁                        │
│      Ice cream trip                 │
│          20 pts                     │
│                                     │
│  Current balance: 15 pts            │
│  Need 5 more points                 │
│                                     │
│  ┌────────────────────────────┐    │
│  │          OK                │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Behavior Details

### Balance Validation

- Checks `pointBalance >= reward.pointCost` before allowing redemption
- Shows error message if balance is insufficient
- Disables confirm/approve button when balance is too low

### Parent Approval Flow

When `reward.parentApprovalRequired === true`:
- Shows "Approve" (primary, green) and "Deny" (secondary, outlined) buttons
- Displays approval notice: "🔒 This reward requires parent approval"
- "Deny" closes the dialog without redemption
- "Approve" proceeds with redemption

When `reward.parentApprovalRequired === false`:
- Shows "Confirm" (primary, blue) and "Cancel" (secondary, outlined) buttons
- No approval notice displayed
- "Cancel" closes the dialog without redemption
- "Confirm" proceeds with redemption

### Undo Window

After successful redemption:
1. Shows success state with celebration emoji (🎉)
2. Displays new balance in a green-highlighted card
3. Shows undo button with countdown: "↩️ Undo (5s)"
4. Timer counts down from 5 to 0 seconds
5. When timer reaches 0, auto-closes dialog after 500ms delay
6. Tapping undo button calls `undoPointEvent(redemptionEventId)`
7. Successful undo closes the dialog immediately

### Error Handling

Error states display:
- Error emoji (⚠️)
- "Unable to Redeem" title
- Error message in red-tinted card
- Reward details for context
- Additional context for insufficient balance errors
- "OK" button to dismiss

## Styling

The component follows Attune's design system:

### Colors
- **Primary action**: `colors.accent` (blue #4A90E2)
- **Approval action**: `colors.sage` (green #7FBF9F)
- **Success highlights**: `colors.sageLight` with `colors.sage` border
- **Undo button**: `colors.warmLight` with `colors.warn` border
- **Error highlights**: `colors.tintAlert` with `colors.error` border
- **Neutral backgrounds**: `colors.bg` (#F7F8F6)

### Typography
- Titles: 20px, weight 700
- Balance values: 28px (success), 24px (confirm), weight 700
- Body text: 14px, weight 500
- Labels: 12px, weight 600, uppercase

### Spacing & Radius
- Card padding: 24px
- Element gaps: 12-20px
- Border radius: `radius.card` (18px) and `radius.button` (22px)
- Elevated shadow for modal card

## Integration Notes

### With CatalogView

`CatalogView` should trigger this dialog when a user taps on a reward card:

```typescript
const handleRewardPress = (reward: Reward) => {
  setSelectedReward(reward);
  setRedemptionDialogVisible(true);
};
```

### With RewardsContext

The dialog automatically:
- Reads `pointBalance` for validation
- Calls `redeemReward(reward.id)` on confirmation
- Calls `undoPointEvent(eventId)` when undo is tapped
- Displays `error` messages from context

### With UndoManager

While the dialog handles the UI countdown, the actual undo registration happens in `RewardsContext`:

```typescript
// In RewardsContext.redeemReward()
const undoAction: UndoableAction = {
  id: pointEvent.id,
  type: 'redemption',
  entityId: pointEvent.id,
  timestamp: new Date(),
  expiresAt: new Date(Date.now() + 5000),
  undoFn: async () => {
    await undoPointEvent(pointEvent.id);
  },
};
undoManager.registerUndoableAction(undoAction);
```

## Testing Scenarios

### Happy Path (No Approval)
1. Open dialog with reward (sufficient balance, no approval required)
2. Verify balance calculations are correct
3. Tap "Confirm"
4. Verify success state appears
5. Verify countdown timer starts at 5 seconds
6. Wait for timer to reach 0
7. Verify dialog auto-closes

### Happy Path (With Approval)
1. Open dialog with reward (sufficient balance, approval required)
2. Verify "Approve/Deny" buttons shown
3. Verify approval notice displayed
4. Tap "Approve"
5. Verify success state with undo button

### Undo Flow
1. Complete redemption (reaches success state)
2. Tap "Undo" button before timer expires
3. Verify `undoPointEvent` is called
4. Verify dialog closes

### Insufficient Balance
1. Open dialog with reward costing more than current balance
2. Verify error state is shown
3. Verify error message explains insufficient points
4. Verify additional context shows how many more points needed
5. Verify "Confirm/Approve" button is disabled

### Deny/Cancel Flow
1. Open dialog with reward
2. Tap "Deny" (approval required) or "Cancel" (no approval)
3. Verify dialog closes without redemption
4. Verify no point changes

## Accessibility

- All touchable elements have appropriate hitboxes
- Color is not the only indicator (uses emoji + text)
- Clear visual hierarchy with size and weight
- Error messages are descriptive and actionable
- Countdown timer is visible and prominent

## Future Enhancements

Potential improvements:
- Add haptic feedback on redemption success
- Animate balance value transitions
- Add confetti animation on success
- Sound effects for redemption (optional user setting)
- Accessibility improvements for screen readers
- Animation when dialog state changes
- More detailed undo confirmation if user has slow response time

## Related Components

- `CatalogView`: Displays reward catalog and triggers this dialog
- `RewardFormModal`: For creating/editing rewards
- `RewardsContext`: Provides data and actions
- `UndoManager`: Manages undo expiration logic

## Files

- Component: `mobile/components/RedemptionConfirmationDialog.tsx`
- Documentation: `mobile/components/RedemptionConfirmationDialog.README.md`
- Context: `mobile/contexts/RewardsContext.tsx`
- Models: `mobile/models/reward.ts`, `mobile/models/point-event.ts`
- Undo Manager: `mobile/utils/undo-manager.ts`
