import { alpha, type PaletteOptions } from '@mui/material/styles';

const gold = {
  light: '#E6CE8A',
  main: '#C9A227',
  dark: '#9C7A12',
};

const champagne = {
  light: '#F7EFD9',
  main: '#EADBB0',
  dark: '#CDB77A',
};

const ink = {
  light: '#FFFDF7',
  main: '#6B6254',
  dark: '#2E2A24',
};


const white = '#FFFFFF';

const inkDivider = alpha(ink.dark, 0.25);

declare module '@mui/material/styles' {
  interface Palette {
    ink: Palette['primary'];
  }
  interface PaletteOptions {
    ink?: PaletteOptions['primary'];
  }
}

export const palette = {
    mode: 'light',
    primary: { ...gold, contrastText: white },
    secondary: { ...champagne, contrastText: ink.dark },
    ink: { ...ink, contrastText: white },
    background: { default: ink.light, paper: white },
    text: { primary: ink.dark, secondary: ink.main },
    divider: inkDivider,
  } satisfies PaletteOptions;