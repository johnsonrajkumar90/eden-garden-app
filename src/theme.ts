// TripArro colours and type — the same as the website and the native app.
import { TextStyle } from 'react-native';

export const Brand = {
  Blue: '#D7192A', BlueDark: '#A70F1E', Navy: '#6A1019', Matte: '#B81D2B',
  Sun: '#FFC72C', SunDark: '#E0A800', SunSoft: '#FFF6D6', SunInk: '#4A3400',
  Teal: '#00875A', TealDark: '#00704A', TealSoft: '#E5F6EE',
  Coral: '#FF5757', CoralDark: '#B81D2B',
  Page: '#F7F5F2', Sky: '#FFF0EF', Ink: '#1D1B1A', InkSoft: '#3D3936', Muted: '#6B6560', Line: '#EBE5DF',
  Warn: '#A35C00', WarnSoft: '#FFF3DF', Danger: '#C62828', DangerSoft: '#FDECEC', Star: '#E0A800',
  Night: '#15161C', NightPlum: '#241A2A',
};

/** The red of every top bar (matte red → bright red → orange-red). */
export const RedBar = [Brand.Matte, '#D7192A', '#E8452F'] as const;

// Poppins for headings, Inter for text (font files in assets/fonts, names = file names)
const P = { m: 'poppins_medium', s: 'poppins_semibold', b: 'poppins_bold' };
const I = { r: 'inter_regular', m: 'inter_medium', s: 'inter_semibold', b: 'inter_bold' };

export const T: Record<string, TextStyle> = {
  displaySmall: { fontFamily: P.b, fontSize: 30, lineHeight: 36, letterSpacing: -0.3, color: Brand.Ink },
  headlineMedium: { fontFamily: P.b, fontSize: 26, lineHeight: 32, letterSpacing: -0.2, color: Brand.Ink },
  headlineSmall: { fontFamily: P.s, fontSize: 22, lineHeight: 28, color: Brand.Ink },
  titleLarge: { fontFamily: P.s, fontSize: 18, lineHeight: 24, color: Brand.Ink },
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
