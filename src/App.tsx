import { useEffect, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Alert, AppBar, Avatar, Box, Button, Container, Paper, Stack, Toolbar, Typography, useTheme } from '@mui/material';
import type { PublishedForm, User } from '../shared/types';
import { api } from './api';
import Builder from './builder/Builder';
import Sidebar from './builder/Sidebar';

export default function App() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<PublishedForm[]>([]);
  // Bumping this remounts the builder with empty state for a new event.
  const [builderKey, setBuilderKey] = useState(0);
  const { palette } = useTheme();

  useEffect(() => {
    Promise.all([api.authConfig(), api.me()])
      .then(([config, me]) => {
        setClientId(config.googleClientId);
        setUser(me);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.listForms()
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  async function handleCredential(credential: string | undefined) {
    if (!credential) {
      setError('Google did not return a credential');
      return;
    }
    try {
      setUser(await api.loginWithGoogle(credential));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  if (loading) return null;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h4" component="h1" color="primary.dark" sx={{ flexGrow: 1 }}>
            EverAfter
          </Typography>
          {user && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              {user.picture && (
                <Avatar src={user.picture} alt="" slotProps={{ img: { referrerPolicy: 'no-referrer' } }} sx={{ width: 32, height: 32 }} />
              )}
              <Typography>{user.name}</Typography>
              <Button variant="outlined" size="small" onClick={logout}>
                Sign out
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth={user ? false : 'sm'} sx={{ py: 5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {user ? (
          <Box sx={{ display: 'flex', gap: 4, height: '80vh' }}>
            <Sidebar events={events} onNewEvent={() => setBuilderKey((key) => key + 1)} />
            <Box sx={{
              backgroundColor: 'background.paper',
              flexGrow: 1,
              minWidth: 0,
              overflow: 'auto',
              padding: 8,
              border: `2px solid ${palette.primary.main}`,
              outline: `2px solid ${palette.primary.main}`,
              outlineOffset: '-8px',
            }}>
              <Builder key={builderKey} onPublished={(form) => setEvents((current) => [form, ...current])} />
            </Box>
          </Box>
        ) : clientId ? (
          <GoogleOAuthProvider clientId={clientId}>
            <Paper sx={{ p: 4 }}>
              <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <Typography variant="h5">Welcome</Typography>
                <Typography color="text.secondary">Sign in to see your dashboard.</Typography>
                <Box>
                  <GoogleLogin
                    onSuccess={(res) => handleCredential(res.credential)}
                    onError={() => setError('Google sign-in failed')}
                  />
                </Box>
              </Stack>
            </Paper>
          </GoogleOAuthProvider>
        ) : (
          <Alert severity="error">Google login is not configured. Set GOOGLE_CLIENT_ID in .env.</Alert>
        )}
      </Container>
    </>
  );
}
