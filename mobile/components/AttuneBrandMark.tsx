import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface AttuneBrandMarkProps {
  /** Width/height of the square logo mark, in points. */
  logoSize?: number;
  /** Font size of the "Attune" wordmark below the logo. */
  wordmarkFontSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Attune's logo mark + "Attune" wordmark, stacked vertically. Reusable
 * anywhere in the app that wants this lockup (e.g. an About/Profile
 * screen) - NOT currently used on the splash screen. The splash needs
 * the wordmark to render during the native, static-image-only splash
 * phase (before this component's fonts/JS are even running), so it uses
 * a separate pre-baked image (assets/attune_splash_lockup.png, wired up
 * in app/_layout.tsx + the expo-splash-screen config plugin) instead.
 *
 * The wordmark here is rendered as real text (Nunito_800ExtraBold,
 * loaded via @expo-google-fonts/nunito in _layout.tsx), NOT baked into
 * the logo image - this keeps it crisp at any size and independently
 * restylable without regenerating any image asset.
 *
 * Uses the transparent glyph (assets/attune_logo_transparent.png), not
 * the flattened-white icon asset - safe on any light/white background
 * (which is every screen this is used on so far), but has a faint white
 * edge halo that would show as a light fringe on a dark background - see
 * the session notes on this asset's alpha channel if this is ever placed
 * on a dark surface.
 */
export function AttuneBrandMark({ logoSize = 160, wordmarkFontSize = 46, style }: AttuneBrandMarkProps) {
  // Even with the logo image preloaded/decoded ahead of time (see
  // _layout.tsx), <Image> still has its own native-side mount/paint step
  // that can land a frame after the sibling <Text> (which paints as soon
  // as its layout is committed - there's no decode step for text). This
  // was reported as the wordmark still visibly "beating" the logo.
  //
  // Both elements stay mounted (and keep reserving their layout space)
  // the whole time - only their opacity is gated on `imageReady`, set
  // from the <Image>'s own onLoadEnd rather than the earlier
  // downloadAsync() preload. Conditionally mounting/unmounting the Text
  // instead would remove it from the centered column's layout, so the
  // logo would jump position the moment the wordmark appeared - fading
  // both in place from the same flip avoids that reflow.
  const [imageReady, setImageReady] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/attune_logo_transparent.png')}
        style={{ width: logoSize, height: logoSize, opacity: imageReady ? 1 : 0 }}
        resizeMode="contain"
        onLoadEnd={() => setImageReady(true)}
      />
      <Text
        style={[
          styles.wordmark,
          // Negative margin pulls the wordmark up closer to the logo -
          // the source PNG has some built-in bottom padding around the
          // glyph (visible whitespace below the arcs/A shape), so a
          // small negative offset is what actually closes the visual gap
          // rather than just adding less positive spacing.
          { fontSize: wordmarkFontSize, marginTop: logoSize * -0.06, opacity: imageReady ? 1 : 0 },
        ]}
      >
        Attune
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#4A90E2',
    letterSpacing: 0.3,
  },
});
