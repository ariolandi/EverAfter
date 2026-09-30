import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App';
import SharedForm from './form/SharedForm';
import { theme } from './theme/theme';
import './fonts.css';

// Share links look like /f/<slug> and open the public form without signing in.
const shareSlug = window.location.pathname.match(/^\/f\/([\w-]+)\/?$/)?.[1];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {shareSlug ? <SharedForm slug={shareSlug} /> : <App />}
    </ThemeProvider>
  </StrictMode>,
);
