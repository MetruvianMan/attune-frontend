# PointBalanceCard Component

## Overview
The `PointBalanceCard` component displays a child's current point balance in a large, centered, emoji-forward card. The component automatically applies color styling based on the balance value to provide visual feedback.

## Requirements Covered
- **2.1**: Large, centered point balance display
- **2.2**: Emoji-forward design with star emoji (⭐)
- **2.3**: Dynamic color styling based on balance
- **2.4**: Rounded card with soft shadow
- **2.5**: Updates within 200ms when balance changes (via React state)
- **2.6**: Cheerful visual design
- **24.4**: Performance requirement (200ms update)

## Props

### `balance: number` (required)
The current point balance to display. Can be:
- **Positive**: Styled with green (#4CAF50) for cheerful, encouraging feel
- **Zero**: Styled with neutral gray (#757575)
- **Negative**: Styled with muted orange (#FF9800) for gentle warning

## Color Palette
- **Green (#4CAF50)**: Positive balance - encouraging and cheerful
- **Neutral Gray (#757575)**: Zero balance - neutral state
- **Muted Orange (#FF9800)**: Negative balance - gentle warning (not harsh red)

## Design Pattern
Follows Attune's design system:
- **Rounded corners** (12px border radius)
- **Soft shadows** (elevation: 2, shadowOpacity: 0.1)
- **Emoji-forward** (48px emoji size)
- **Large numbers** (56px font size for balance)
- **Centered layout** with appropriate padding

## Performance
The component updates within 200ms when the `balance` prop changes, thanks to React's efficient re-rendering. No animations are needed - the state change is instantaneous.

## Usage

### Basic Usage
```tsx
import { PointBalanceCard } from './components/PointBalanceCard';

function MyScreen() {
  const balance = 150; // From your state or context
  
  return <PointBalanceCard balance={balance} />;
}
```

### With RewardsContext
```tsx
import { PointBalanceCard } from './components/PointBalanceCard';
import { useRewards } from './contexts/RewardsContext';

function RewardsScreen() {
  const { pointBalance } = useRewards();
  
  return <PointBalanceCard balance={pointBalance} />;
}
```

## Example States

### Positive Balance (Green)
```tsx
<PointBalanceCard balance={150} />
```
Displays: ⭐ **150** in green (#4CAF50)

### Zero Balance (Neutral)
```tsx
<PointBalanceCard balance={0} />
```
Displays: ⭐ **0** in gray (#757575)

### Negative Balance (Muted Orange)
```tsx
<PointBalanceCard balance={-25} />
```
Displays: ⭐ **-25** in muted orange (#FF9800)

## Implementation Notes

### Why Not Red for Negative?
The component uses **muted orange** (#FF9800) instead of red for negative balances. This follows child-friendly UX principles:
- Red can be harsh and discouraging for children
- Orange provides a gentle warning without negative emotional impact
- Maintains a positive, encouraging app experience

### Emoji Choice
The component uses the ⭐ (star) emoji because:
- Universal symbol for rewards and achievements
- Cheerful and child-friendly
- Visually distinct and recognizable
- Consistent with the "points" metaphor

### Performance Optimization
The component is lightweight and performant:
- No animations or transitions (instant updates)
- Simple color calculation function
- Minimal re-renders (only when balance prop changes)
- No expensive operations or side effects

## Related Components
- **RewardsTabScreen**: Main consumer of this component
- **UndoToast**: Shows when point changes occur
- **QuickLogModal**: Interface for earning points
- **RedemptionConfirmationDialog**: Interface for spending points

## Testing
See `PointBalanceCard.example.tsx` for visual examples of all three states (positive, zero, negative).
