/**
 * Attune Design System
 * Exact match to web app styling
 */

export const colors = {
  bg: '#F7F8F6',
  bgDeep: '#EDF5F3',
  card: '#FFFFFF',
  cardBg: '#FFFFFF', // Alias for card
  cardHover: 'rgba(255,255,255,0.95)',
  primary: '#4A90E2', // Alias for accent
  accent: '#4A90E2',
  accentLight: 'rgba(74,144,226,0.08)',
  accentBright: '#5BA0F0',
  sage: '#7FBF9F',
  sageLight: 'rgba(127,191,159,0.10)',
  blue: '#4A90E2',
  blueLight: 'rgba(74,144,226,0.08)',
  warm: '#F2C94C',
  warmLight: 'rgba(242,201,76,0.12)',
  lavender: '#9b8ec4',
  lavenderLight: 'rgba(155,142,196,0.10)',
  rose: '#c27a8e',
  roseLight: 'rgba(194,122,142,0.10)',
  text: '#2D3436',
  textDim: '#636E72',
  textMuted: '#B2BEC3',
  error: '#EB5757', // Alias for danger
  danger: '#EB5757',
  warn: '#F2C94C',
  border: 'rgba(74,144,226,0.12)',
  borderSubtle: 'rgba(74,144,226,0.06)',
  tintWellness: '#F3FAF6',
  tintAlert: '#FFF6F6',
  tintSection: '#F0F7F5',
  
  // Form-specific colors
  inputBorder: 'rgba(45,52,54,0.10)',
  inputBg: 'rgba(74,144,226,0.02)',
  inputFocusBorder: 'rgba(74,144,226,0.3)',
  chipBg: 'rgba(45,52,54,0.04)',
  chipSelectedBg: 'rgba(74,144,226,0.14)',
  chipSelectedBorder: 'rgba(74,144,226,0.35)',
  chipSelectedText: '#2B5A8E',
  destructive: '#E57373',
  secondaryButton: 'rgba(74,144,226,0.08)',
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 6,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const radius = {
  card: 18,
  button: 22,
  input: 14, // Modernized from 12
  chip: 16, // Added for chips
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
};

export const spacing = {
  cardPadding: 18,
  sectionPadding: 14,
  cardMargin: 16,
  screenPadding: 18,
};

export const typography = {
  h1: {
    fontSize: 21, // Increased ~15% for mobile prominence
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 12.5, // Increased section headers
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.0,
  },
  body: {
    fontSize: 14.5, // Increased ~15% for readability
    fontWeight: '400' as const,
  },
  bodyLarge: {
    fontSize: 16, // For event titles
    fontWeight: '600' as const,
  },
  bodySmall: {
    fontSize: 13, // Increased
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 13, // Alias for bodySmall
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 11.5, // Increased
    fontWeight: '400' as const,
  },
  tiny: {
    fontSize: 10.5, // Increased
    fontWeight: '400' as const,
  },
};

export const gradients = {
  primary: ['#4A90E2', '#7FBF9F'],
};
