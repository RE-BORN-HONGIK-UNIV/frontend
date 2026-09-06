import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** Green brand scale (0 lightest → 9 darkest). Index 6 = --rb-primary. */
const brand: MantineColorsTuple = [
  '#edf6f0',
  '#dcede2',
  '#c2e0cc',
  '#a3d2b3',
  '#86c49b',
  '#6ab183',
  '#4c8a64', // primary
  '#3b6b4c', // strong
  '#2c543b', // deep
  '#1e3d2b',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 8 },
  colors: { brand },

  fontFamily: "'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif",
  headings: {
    fontFamily: "'Noto Sans KR', system-ui, sans-serif",
    fontWeight: '700',
  },

  defaultRadius: 'md',
  radius: { xs: '6px', sm: '10px', md: '16px', lg: '24px', xl: '32px' },

  other: {
    fontDisplay: "'Spectral', 'Iowan Old Style', Georgia, serif",
    gradient: 'linear-gradient(105deg, #2c543b 0%, #8ac79b 100%)',
  },
});
