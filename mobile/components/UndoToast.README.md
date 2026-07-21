# UndoToast Component

**Task:** 12.3 Create UndoToast component  
**Spec:** Rewards Tab - mobile/components/UndoToast.tsx

## Overview

`UndoToast` is a temporary notification component that appears at the bottom of the screen after point-related actions (logging behaviors or redeeming rewards). It displays a success message with an "Undo" button, automatically dismissing after 5 seconds.

## Requirements Covered

- **10.4**: Display confirmation message with undo button for 5 seconds
- **10.5**: Auto-dismiss after timeout
- **11.3**: Support undo for demerit behaviors with muted visual styling
- **15.6**: Provide undo button for 5 seconds after redemption

## Features

✅ Toast/Snackbar that appears at bottom of screen  
✅ Shows success message (e.g., "+10 points logged!")  
✅ "Undo" button on the right  
✅ Auto-dismiss after 5 seconds (configurable)  
✅ Manual dismiss via X button  
✅ Smooth slide-in/slide-out animations using Animated API  
✅ Color-coded by action type:
  - **Green** for positive points (earned behaviors)
  - **Blue** for redemptions  
  - **Muted orange** for negative points (demerits)

## Props Interface

```typescript
interface UndoToastProps {
  /** Whether the toast is visible */
  visible: boolean;
  
  /** Success message to display (e.g., "+10 points logged!") */
  message: string;
  
  /** Callback when undo button is pressed */
  onUndo: () => void;
  
  /** Callback when toast is dismissed (auto or manual) */
  onDismiss: () => void;
  
  /** Auto-dismiss duration in milliseconds (default: 5000ms) */
  duration?: number;
  
  /** Type of toast for color theming */
  type?: 'positive' | 'negative' | 'neutral';
}
```

## Usage Examples

### Basic Usage (Positive Points)

```typescript
import { UndoToast } from '../components/UndoToast';

function RewardsScreen() {
  const [toastVisible, setToastVisible] = useState(false);
  const [lastPointEventId, setLastPointEventId] = useState<string | null>(null);

  const handleBehaviorLogged = (pointEventId: string, points: number) => {
    setLastPointEventId(pointEventId);
    setToastVisible(true);
  };

  const handleUndo = async () => {
    if (lastPointEventId) {
      await undoPointEvent(lastPointEventId);
      setToastVisible(false);
    }
  };

  const handleDismiss = () => {
    setToastVisible(false);
    setLastPointEventId(null);
  };

  return (
    <View>
      {/* Your screen content */}
      
      <UndoToast
        visible={toastVisible}
        message="+10 points logged! 🎉"
        type="positive"
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}
```

### Demerit Behavior (Negative Points)

```typescript
<UndoToast
  visible={toastVisible}
  message="-5 points logged"
  type="negative"
  onUndo={handleUndo}
  onDismiss={handleDismiss}
/>
```

### Reward Redemption (Blue/Neutral)

```typescript
<UndoToast
  visible={toastVisible}
  message="🍦 Ice cream redeemed! -20 points"
  type="neutral"
  onUndo={handleUndo}
  onDismiss={handleDismiss}
  duration={5000}
/>
```

### Custom Duration

```typescript
<UndoToast
  visible={toastVisible}
  message="+15 points logged!"
  type="positive"
  onUndo={handleUndo}
  onDismiss={handleDismiss}
  duration={7000} // 7 seconds instead of default 5
/>
```

## Integration with RewardsContext

The component is designed to work seamlessly with the existing `RewardsContext`:

```typescript
import { useRewards } from '../contexts/RewardsContext';
import { UndoToast } from '../components/UndoToast';

function RewardsTabScreen() {
  const { logBehavior, undoPointEvent } = useRewards();
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    type: 'positive' | 'negative' | 'neutral';
    pointEventId: string | null;
  }>({
    visible: false,
    message: '',
    type: 'positive',
    pointEventId: null,
  });

  const handleLogBehavior = async (behaviorId: string) => {
    try {
      // logBehavior returns the created PointEvent
      const pointEvent = await logBehavior(behaviorId);
      
      // Determine message and type
      const behavior = behaviors.find(b => b.id === behaviorId);
      const points = behavior?.pointValue || 0;
      const isPositive = points > 0;
      
      setToastConfig({
        visible: true,
        message: `${isPositive ? '+' : ''}${points} points logged! ${behavior?.emoji || ''}`,
        type: isPositive ? 'positive' : 'negative',
        pointEventId: pointEvent.id,
      });
    } catch (error) {
      console.error('Error logging behavior:', error);
    }
  };

  const handleUndo = async () => {
    if (toastConfig.pointEventId) {
      await undoPointEvent(toastConfig.pointEventId);
      setToastConfig(prev => ({ ...prev, visible: false }));
    }
  };

  const handleDismiss = () => {
    setToastConfig(prev => ({ ...prev, visible: false }));
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Screen content */}
      
      <UndoToast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}
```

## Design Specifications

### Colors

- **Positive (Green):**
  - Background: `#4CAF50`
  - Border: `#388E3C`
  
- **Negative (Muted Orange):**
  - Background: `#FF9800`
  - Border: `#F57C00`
  
- **Neutral (Blue):**
  - Background: `#2196F3`
  - Border: `#1976D2`

### Positioning

- Bottom position: 90px on iOS, 70px on Android (above tab bar)
- Horizontal margins: 18px
- Z-index: 1000 (appears above all content)

### Animation

- **Slide In:** Spring animation (tension: 65, friction: 11)
- **Slide Out:** Timing animation (250ms)
- Translates from 200px below screen to position 0

### Dimensions

- Width: Screen width minus 36px margins
- Min height: 56px
- Border radius: 18px (matching Attune card radius)

## Accessibility

- Touch targets: 44pt minimum (Undo button and dismiss X)
- Hit slop: 8px padding around buttons for easier tapping
- Text: High contrast white text on colored backgrounds
- Screen readers: Automatically read message when toast appears

## Performance Considerations

- Uses `useNativeDriver: true` for smooth 60fps animations
- Auto-cleanup of timers on unmount
- Pointer events set to `box-none` to avoid blocking touches outside toast
- Component doesn't render when not visible (optimization)

## Testing

### Manual Test Cases

1. **Basic Display:**
   - [ ] Toast slides up from bottom smoothly
   - [ ] Message displays correctly
   - [ ] Undo and X buttons are visible and tappable

2. **Auto-Dismiss:**
   - [ ] Toast dismisses automatically after 5 seconds
   - [ ] Animation slides out smoothly

3. **Manual Dismiss:**
   - [ ] Tapping X button dismisses toast immediately
   - [ ] onDismiss callback is triggered

4. **Undo Action:**
   - [ ] Tapping Undo button calls onUndo callback
   - [ ] Toast dismisses after undo

5. **Color Variants:**
   - [ ] type="positive" shows green background
   - [ ] type="negative" shows muted orange background
   - [ ] type="neutral" shows blue background

6. **Custom Duration:**
   - [ ] duration prop changes auto-dismiss timing correctly

7. **Multiple Toasts:**
   - [ ] Previous toast is dismissed when new toast appears
   - [ ] No timer conflicts

## Known Limitations

- Only one toast can be displayed at a time (by design)
- Toast doesn't queue multiple messages (intentional for simplicity)
- Doesn't support custom positioning (always bottom-center)

## Future Enhancements (Not in Current Scope)

- Toast queue for multiple messages
- Swipe-to-dismiss gesture
- Different animation types (fade, scale, etc.)
- Custom icons instead of just text
- Haptic feedback on undo/dismiss

## Related Components

- `QuickLogModal`: Uses UndoToast after logging behaviors
- `CatalogView`: Uses UndoToast after redeeming rewards
- `RewardsContext`: Provides state management for point events and undo functionality

## Requirements Alignment

This component directly supports the following acceptance criteria:

- **Req 10.4:** "THE Attune_App SHALL provide an Undo_Action button for 5 seconds after the Point_Event is created"
- **Req 10.5:** "WHEN the Parent taps the Undo_Action button, THE Attune_App SHALL delete the Point_Event and restore the previous Point_Balance"
- **Req 11.3:** "THE Attune_App SHALL allow the Parent to undo a demerit Point_Event within 5 seconds using the Undo_Action"
- **Req 15.6:** "THE Attune_App SHALL provide an Undo_Action button for 5 seconds after the Redemption is created"

## Maintenance Notes

- Component follows React Native best practices
- Uses TypeScript for type safety
- Matches Attune design system (colors, shadows, radius)
- No external dependencies beyond React Native core
- Self-contained with no side effects
