import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';

interface PublicInvitationPageProps {
    /** Why the invitation couldn't be loaded. */
    error: string | null;
    /** The invitation, once loaded; nothing is shown while it loads. */
    children?: ReactNode;
}

/** The full-screen page a guest opens an invitation link on. */
export default function PublicInvitationPage({ error, children }: PublicInvitationPageProps) {
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (!children) return null;
    return <Box sx={{ height: '100dvh', maxWidth: 800, mx: 'auto' }}>{children}</Box>;
}
