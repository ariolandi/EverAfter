import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';

interface PublicInvitationPageProps {
    /** Why the invitation couldn't be loaded. */
    error: string | null;
    /** The invitation, once loaded; nothing is shown while it loads. */
    children?: ReactNode;
}

const MAX_WIDTH = 800;
const EDGE = 14;
const GOLD_STOPS = ['#f5e6a8', '#b8902f 20%', '#fbf0c4 40%', '#9a7220 60%', '#e6cf85 80%', '#a97f26'];

/** The full-screen page a guest opens an invitation link on. */
export default function PublicInvitationPage({ error, children }: PublicInvitationPageProps) {
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (!children) return null;
    return (
        <Box
            sx={{
                height: '100dvh',
                maxWidth: MAX_WIDTH,
                mx: 'auto',
                // On screens wider than the invitation, a thick gold edge on the left and right frames it.
                [`@media (min-width: ${MAX_WIDTH}px)`]: {
                    boxSizing: 'border-box',
                    borderStyle: 'solid',
                    borderWidth: `0 ${EDGE}px`,
                    borderImage: `linear-gradient(to bottom, ${GOLD_STOPS.join(', ')}) 1`,
                },
            }}
        >
            {children}
        </Box>
    );
}
