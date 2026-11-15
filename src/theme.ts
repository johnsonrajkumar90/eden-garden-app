// TripArro colours and type. The look: frosted white glass over a warm white page lit with red and sun-yellow, red actions, yellow highlights.
import { TextStyle } from 'react-native';

export const Brand = {
  Blue: '#D93338', BlueDark: '#A8242A', Navy: '#5C1418', Matte: '#161616',
  Sun: '#FFC72C', SunDark: '#E0A800', SunSoft: '#FFF6D6', SunInk: '#4A3400',
  Teal: '#00875A', TealDark: '#00704A', TealSoft: '#E5F6EE',
  Coral: '#FF5757', CoralDark: '#D93338',
  Page: '#F7F6F4', Sky: '#FFEDEB', Ink: '#161616', InkSoft: '#3F3F46', Muted: '#6E6E76', Line: '#ECEAE6',
  Card: '#FFFFFF', Field: 'rgba(255,255,255,0.78)', Glass: 'rgba(255,255,255,0.72)', GlassLine: 'rgba(255,255,255,0.95)',
  Warn: '#A35C00', WarnSoft: '#FFF3DF', Danger: '#C62828', DangerSoft: '#FDECEC', Star: '#E0A800',
  Night: '#15161C', NightPlum: '#241A2A',
};

/** The logo's coral arch, for the few brand moments (sign-in, AI, group trip covers). */
export const RedBar = ['#D93338', '#E8474B', '#FF5757'] as const;

// Poppins for headings, Inter for text (font files in assets/fonts, names = file names)
const P = { m: 'poppins_medium', s: 'poppins_semibold', b: 'poppins_bold' };
const I = { r: 'inter_regular', m: 'inter_medium', s: 'inter_semibold', b: 'inter_bold' };

export const T: Record<string, TextStyle> = {
  displaySmall: { fontFamily: P.b, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: Brand.Ink },
  headlineMedium: { fontFamily: P.b, fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: Brand.Ink },
  headlineSmall: { fontFamily: P.b, fontSize: 23, lineHeight: 29, letterSpacing: -0.3, color: Brand.Ink },
  titleLarge: { fontFamily: P.s, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: Brand.Ink },
  titleMedium: { fontFamily: I.s, fontSize: 16, lineHeight: 22, color: Brand.Ink },
  titleSmall: { fontFamily: I.s, fontSize: 14, lineHeight: 20, color: Brand.Ink },
  bodyLarge: { fontFamily: I.r, fontSize: 16, lineHeight: 24, color: Brand.Ink },
  bodyMedium: { fontFamily: I.r, fontSize: 14, lineHeight: 21, color: Brand.Ink },
  bodySmall: { fontFamily: I.r, fontSize: 12.5, lineHeight: 18, color: Brand.Ink },
  labelLarge: { fontFamily: I.s, fontSize: 15, color: Brand.Ink },
  labelMedium: { fontFamily: I.m, fontSize: 12, lineHeight: 16, color: Brand.Ink },
  labelSmall: { fontFamily: I.s, fontSize: 11, lineHeight: 14, color: Brand.Ink },
};
export const Fonts = { ...P, ...I, bold: I.b, semi: I.s, medium: I.m, regular: I.r };
