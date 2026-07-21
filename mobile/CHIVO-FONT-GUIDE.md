# Chivo Font Usage Guide

The Chivo font family is now installed and ready to use in the Attune mobile app.

## Available Weights

- **Light (300)**: `Chivo_300Light`, `Chivo_300Light_Italic`
- **Regular (400)**: `Chivo_400Regular`, `Chivo_400Regular_Italic`
- **Bold (700)**: `Chivo_700Bold`, `Chivo_700Bold_Italic`
- **Black (900)**: `Chivo_900Black`, `Chivo_900Black_Italic`

## How to Use

### Method 1: Direct Font Name

```typescript
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Chivo_700Bold',
    fontSize: 18,
  },
});
```

### Method 2: Using the Constants (Recommended)

```typescript
import { StyleSheet } from 'react-native';
import { ChivoFonts } from '../constants/fonts';

const styles = StyleSheet.create({
  title: {
    fontFamily: ChivoFonts.Bold,
    fontSize: 18,
  },
  body: {
    fontFamily: ChivoFonts.Regular,
    fontSize: 14,
  },
});
```

## Example: Updating Event Titles

To change event titles to use Chivo Bold:

```typescript
// In DraggableEventList.tsx or index.tsx
import { ChivoFonts } from '../constants/fonts';

const styles = StyleSheet.create({
  eventLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ChivoFonts.Bold,  // Add this line
    color: colors.text,
    lineHeight: 20,
  },
});
```

## Notes

- The font is loaded in `app/_layout.tsx`
- The app will show a loading screen until fonts are ready
- Available font weights are exported from `constants/fonts.ts`
- Chivo is a clean, modern sans-serif font perfect for UI text
