import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { InvitationDetails, FormFields, FormResponseInput } from '../../shared/types';

interface Props {
    fields: FormFields;
    details: InvitationDetails;
    imageUrl: string | null;
    /** Omit to render a non-submittable preview. */
    onSubmit?: (response: FormResponseInput) => Promise<void>;
}

export default function InvitationForm({ fields, details, imageUrl, onSubmit }: Props) {
    const coupleTitle = [details.brideName, details.groomName].map((n) => n.trim()).filter(Boolean).join(' & ');
    const [year, month, day] = details.weddingDate.split('-').map(Number);
    // Built from parts so the date is local and doesn't shift a day in timezones west of UTC.
    const weddingDate = details.weddingDate
        ? new Date(year, month - 1, day).toLocaleDateString('BG', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const [name, setName] = useState('');
    const [answer, setAnswer] = useState<boolean | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const complete = (!fields.showName || name.trim() !== '') && (!fields.showAnswer || answer !== null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!onSubmit || !complete) return;
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({
                ...(fields.showName && { name: name.trim() }),
                ...(fields.showAnswer && answer !== null && { answer }),
            });
            setSubmitted(true);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                p: 2,
                bgcolor: 'background.default',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <Paper component="form" onSubmit={submit} sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
                <Stack spacing={0.5} sx={{ mb: 2, alignItems: 'center' }}>
                    <Typography variant="h5" align="center" color="primary.dark">
                        {coupleTitle}
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">ви канят на</Typography>
                    <Typography variant="metallic" component="h2" align="center">
                        Сватба
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">на</Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">
                        {weddingDate}
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">в</Typography>
                    <Typography variant="subtitle1" align="center" color="text.secondary">
                        {details.place}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
