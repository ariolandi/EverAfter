import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App';
import GroupInvite from './form/GroupInvite';
import SharedForm from './form/SharedForm';
import { theme } from './theme/theme';
import './fonts.css';

// Share links look like /f/<slug> and open the public form without signing in;
// a guest group's personal link looks like /g/<token>.
const shareSlug = window.location.pathname.match(/^\/f\/([\w-]+)\/?$/)?.[1];
const groupToken = window.location.pathname.match(/^\/g\/([\w-]+)\/?$/)?.[1];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {shareSlug ? <SharedForm slug={shareSlug} /> : groupToken ? <GroupInvite token={groupToken} /> : <App />}
    </ThemeProvider>
  </StrictMode>,
);
