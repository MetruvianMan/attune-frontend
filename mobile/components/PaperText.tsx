import React from 'react';
import {
  Text as RNPaperText,
  Divider as RNPaperDivider,
  TextInput as RNPaperTextInput,
  FAB as RNPaperFAB,
  Banner as RNPaperBanner,
} from 'react-native-paper';
import type {
  TextProps as RNPaperTextProps,
  DividerProps as RNPaperDividerProps,
  TextInputProps as RNPaperTextInputProps,
  FABProps as RNPaperFABProps,
  BannerProps as RNPaperBannerProps,
} from 'react-native-paper';
import { TextStyle } from 'react-native';

// react-native-paper v4.12.8 is installed in this project (see
// package.json), but the app's JSX was written against v5's Text API,
// which adds a `variant` prop (e.g. variant="titleMedium") that applies a
// Material Design 3 type-scale style (font size/weight/line height) -
// v4's Text has no such prop at all. Every `<Text variant="...">` call
// site in the app was silently failing to type-check as a result (569
// call sites across ~40 files, confirmed via `tsc --noEmit`), even though
// it happened to still render at runtime (React just ignores an unknown
// prop passed to a native-backed component).
//
// Rather than edit every call site (real risk of missing one, or
// mistyping a replacement style) or drop `variant` outright (would
// silently lose the intended font size/weight at every one of those 569
// sites - a real visual regression with no way for this pass to verify
// on-device), this file provides a drop-in Text replacement that accepts
// `variant` and translates it into an explicit style, so callers don't
// need to change their JSX at all - only their import needs to point
// here instead of directly at 'react-native-paper'.
//
// Variant values/scale below match the Material Design 3 type scale
// (https://m3.material.io/styles/typography/type-scale-tokens), the same
// scale react-native-paper v5's Text variant is itself based on - so if
// this project ever upgrades react-native-paper to v5+, swapping back to
// its native Text (and removing this shim) should look the same.
export type PaperTextVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall';

const VARIANT_STYLES: Record<PaperTextVariant, TextStyle> = {
  displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64 },
  displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52 },
  displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44 },
  headlineLarge: { fontSize: 32, fontWeight: '400', lineHeight: 40 },
  headlineMedium: { fontSize: 28, fontWeight: '400', lineHeight: 36 },
  headlineSmall: { fontSize: 24, fontWeight: '400', lineHeight: 32 },
  titleLarge: { fontSize: 22, fontWeight: '500', lineHeight: 28 },
  titleMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
};

// `theme` is typed as required on react-native-paper v4's own Text Props
// (it's actually injected automatically via a withTheme() HOC at runtime -
// callers never need to pass it themselves, and none of this app's call
// sites ever did before this shim existed). Re-declaring it here as
// optional matches how the component is actually used throughout the
// app, without which every existing <Text>...</Text> call site missing
// an explicit theme prop would newly fail to type-check through this
// shim.
export interface PaperTextProps extends Omit<RNPaperTextProps, 'theme'> {
  variant?: PaperTextVariant;
  theme?: RNPaperTextProps['theme'];
}

/**
 * Drop-in replacement for react-native-paper's `Text` that additionally
 * accepts a v5-style `variant` prop. Import this instead of `Text` from
 * 'react-native-paper' wherever `variant` is used - see file header.
 *
 * The variant's style is applied FIRST, with the caller's own `style`
 * prop layered on top (RN's StyleSheet array-merge - later entries win
 * per-property), so an explicit style alongside `variant` (as several
 * call sites already do, e.g. for color) continues to override the
 * variant's defaults exactly as it would if v5's real variant prop were
 * doing the merging.
 */
export function PaperText({ variant, style, ...rest }: PaperTextProps) {
  const variantStyle = variant ? VARIANT_STYLES[variant] : undefined;
  return <RNPaperText style={[variantStyle, style]} {...rest} />;
}

// Same underlying issue as PaperText.theme above, but for Divider: v4's
// Divider.Props extends `$RemoveChildren<typeof View>`, which - with the
// react-native 0.81.5 types installed in this project - includes a
// `tvParallaxProperties` prop that TypeScript's Pick<> resolution treats
// as required, even though it's a tvOS-only prop nothing in this RN app
// ever needs to pass and Divider never actually requires at runtime.
// Every zero-prop `<Divider />` call site in the app (8 files, all
// modal/dialog components) was failing to type-check as a result. Same
// fix shape as PaperText: re-declare the prop as optional here so real
// call sites don't need to change.
export interface PaperDividerProps extends Omit<RNPaperDividerProps, 'theme'> {
  theme?: RNPaperDividerProps['theme'];
}

// Cast through `any` for this one internal render call only - RNPaperDivider
// (react-native-paper v4.12.8) is a runtime component that never actually
// reads tvParallaxProperties (confirmed: it isn't referenced anywhere in
// paper's own Divider implementation, which just renders a plain <View>),
// so this cast doesn't skip any real runtime requirement - it only routes
// around a types-only mismatch between paper v4.12.8's Divider.Props and
// the react-native 0.81.5 types installed in this project (see the
// PaperDividerProps comment above).
export function PaperDivider(props: PaperDividerProps) {
  return <RNPaperDivider {...(props as any)} />;
}

// Same tvParallaxProperties/onTextInput types-only mismatch as Divider
// above, this time on paper's TextInput (48 of the ~56 remaining
// occurrences of this issue project-wide are this one component) - see
// PaperDivider's comment for the full explanation. TextInput never
// actually requires these props at runtime.
export interface PaperTextInputProps extends Omit<RNPaperTextInputProps, 'theme'> {
  theme?: RNPaperTextInputProps['theme'];
}

export function PaperTextInput(props: PaperTextInputProps) {
  return <RNPaperTextInput {...(props as any)} />;
}

// react-native-paper's real TextInput carries a static `.Icon`
// sub-component (TextInput.Icon = TextInputIcon, used for the leading/
// trailing icon slots via the `left`/`right` props). Since PaperTextInput
// here is a plain function component wrapping it, that static property
// isn't carried over automatically - call sites using
// `<PaperTextInput.Icon .../>` (see app/(auth)/login.tsx) need it
// re-attached explicitly.
PaperTextInput.Icon = (RNPaperTextInput as any).Icon;

// Same mismatch, on paper's FAB.
export interface PaperFABProps extends Omit<RNPaperFABProps, 'theme'> {
  theme?: RNPaperFABProps['theme'];
}

export function PaperFAB(props: PaperFABProps) {
  return <RNPaperFAB {...(props as any)} />;
}

// Same tvParallaxProperties mismatch, on paper's Banner.
export interface PaperBannerProps extends Omit<RNPaperBannerProps, 'theme'> {
  theme?: RNPaperBannerProps['theme'];
}

export function PaperBanner(props: PaperBannerProps) {
  return <RNPaperBanner {...(props as any)} />;
}
