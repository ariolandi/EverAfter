import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import type { PublishedForm } from '../../shared/types';
import { api } from '../api';
import InvitationForm from './InvitationForm';

/** Public page for a published form, opened from a /f/:slug share link. */
export default function SharedForm({ slug }: { slug: string }) {
    const [form, setForm] = useState<PublishedForm | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getForm(slug)
            .then(setForm)
            .catch((e: Error) => setError(e.message));
    }, [slug]);

    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (!form) return null;

    return (
        <Box sx={{ height: '100dvh', maxWidth: 800, mx: 'auto' }}>
            <InvitationForm
                fields={form}
                details={form}
                imageUrl={form.imageUrl}
                onSubmit={(response) => api.submitFormResponse(slug, response)}
            />
        </Box>
    );
}
