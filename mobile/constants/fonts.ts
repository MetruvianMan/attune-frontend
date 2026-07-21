/**
 * Chivo Font Family Constants
 * 
 * Usage example:
 * 
 * const styles = StyleSheet.create({
 *   title: {
 *     fontFamily: ChivoFonts.Bold,
 *     fontSize: 18,
 *   },
 *   body: {
 *     fontFamily: ChivoFonts.Regular,
 *     fontSize: 14,
 *   }
 * });
 */

export const ChivoFonts = {
  Light: 'Chivo_300Light',
  LightItalic: 'Chivo_300Light_Italic',
  Regular: 'Chivo_400Regular',
  RegularItalic: 'Chivo_400Regular_Italic',
  Bold: 'Chivo_700Bold',
  BoldItalic: 'Chivo_700Bold_Italic',
  Black: 'Chivo_900Black',
  BlackItalic: 'Chivo_900Black_Italic',
} as const;

export type ChivoFontName = typeof ChivoFonts[keyof typeof ChivoFonts];
