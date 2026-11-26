import { alpha, createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';
import { palette } from './palette';
import { defaultTypography, scriptFont } from './typography';

export { scriptFont };


declare module '@mui/material/styles' {
  interface TypographyVariants {
    metallic: CSSProperties;
  }
  interface TypographyVariantsOptions {
    metallic?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    metallic: true;
  }
}

export const theme = createTheme({
  palette,
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Lato', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    h1: defaultTypography,
    h2: defaultTypography,
    h3: defaultTypography,
    h4: { ...defaultTypography, letterSpacing: '0.02em' },
    h5: defaultTypography,
    h6: defaultTypography,
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.03em' },
    // Gold leaf: banded gradient clipped to the glyphs, with a soft drop shadow for depth.
    metallic: {
      fontFamily: scriptFont,
      fontWeight: 700,
      fontSize: '4rem',
      lineHeight: 1.2,
      letterSpacing: '0.02em',
      display: 'inline-block',
      backgroundImage: `linear-gradient(175deg, ${palette.primary.dark} 0%, ${palette.primary.light} 22%, ${palette.secondary.main} 35%, ${palette.primary.main} 50%, ${palette.primary.dark} 62%, ${palette.primary.light} 80%, ${palette.primary.main} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      filter: `drop-shadow(0 1px 1px ${alpha(palette.ink.dark, 0.35)})`,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          backgroundImage: `linear-gradient(160deg, ${palette.secondary.light} 0%, ${palette.primary.light} 45%, ${palette.primary.main} 100%)`,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              // Deep gold so the white text stands out; the light gold alone is too pale behind it.
              style: {
                color: palette.primary.contrastText,
                textShadow: `0 1px 1px ${alpha(palette.ink.dark, 0.45)}`,
                backgroundImage: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.dark} 55%, ${palette.primary.dark} 100%)`,
                '&:hover': {
                  backgroundImage: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.dark} 100%)`,
                },
                // A disabled button drops the gold, so its grey text isn't lost on it.
                '&.Mui-disabled': { backgroundImage: 'none', textShadow: 'none' },
              },
            },
          ],
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${palette.ink.dark}` },
      },
    },
    MuiAppBar: {
      defaultProps: { color: 'inherit', elevation: 0 },
      styleOverrides: {
        root: { backgroundColor: palette.background.paper, border: 'none', borderBottom: `2px solid ${palette.primary.main}` },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.primary.light },
        },
      },
    },
  },
});
