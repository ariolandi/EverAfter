import { useState, type FormEvent } from 'react';
import { Alert, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { FormFields, GroupGuestAnswer, GroupResponse } from '../../shared/types';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';

interface GroupRsvpFormProps {
    fields: FormFields;
    groupName: string;
    guests: { id: number; name: string }[];
    /** The group's answer if it has already been sent; the form then only shows it. */
    response: GroupResponse | null;
    onSubmit: (answers: GroupGuestAnswer[]) => Promise<void>;
}

/** The answer form of a group's personal link: the names are filled in and each guest answers for themselves. */
export default function GroupRsvpForm({ fields, groupName, guests, response, onSubmit }: GroupRsvpFormProps) {
    const [answers, setAnswers] = useState<Record<number, boolean>>({});
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Whether the answer was sent just now, as opposed to before this page was opened.
    const [justSent, setJustSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const complete = guests.length > 0 && (!fields.showAnswer || guests.every((g) => g.id in answers));
    const draft = guests.map((g) => ({ name: g.name, answer: fields.showAnswer ? (answers[g.id] ?? null) : null }));

    const review = (event: FormEvent) => {
        event.preventDefault();
        if (complete) setConfirming(true);
    };

    const send = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit(
                guests.map((g) => ({ guestId: g.id, ...(fields.showAnswer && { answer: answers[g.id] }) })),
            );
            setJustSent(true);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
            setConfirming(false);
        }
    };

    const title = (
        <Typography variant="h6" align="center" color="primary.dark">
            {groupName}
        </Typography>
    );

    if (response) {
        return (
            <Paper sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
                <Stack spacing={1.5}>
                    {justSent ? (
                        <SubmitSuccess />
                    ) : (
                        <Alert severity="info">
                            Вече отговорихте на поканата на{' '}
                            {new Date(response.respondedAt).toLocaleDateString('BG', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                            .
                        </Alert>
                    )}
                    {title}
                    <Typography variant="subtitle2">Вашият отговор</Typography>
                    <GroupAnswer guests={response.guests} />
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper component="form" onSubmit={review} sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
            <Stack spacing={1.5}>
                {title}
                {guests.length === 0 && <Alert severity="warning">В тази покана все още няма гости.</Alert>}
                {guests.map((guest) => (
                    <Stack key={guest.id} spacing={0.5}>
                        <Typography sx={{ fontWeight: 600 }}>{guest.name}</Typography>
                        {fields.showAnswer && (
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size="small"
                                color="primary"
                                aria-label={`Отговор за ${guest.name}`}
                                value={answers[guest.id] ?? null}
                                onChange={(_e, value: boolean | null) =>
                                    setAnswers((current) => {
                                        const next = { ...current };
                                        if (value === null) delete next[guest.id];
                                        else next[guest.id] = value;
                                        return next;
                                    })
                                }
                                disabled={submitting}
                            >
                                <ToggleButton value={true}>Ще присъства</ToggleButton>
                                <ToggleButton value={false}>Няма да присъства</ToggleButton>
                            </ToggleButtonGroup>
                        )}
                    </Stack>
                ))}
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" disabled={!complete || submitting}>
                    Изпрати
                </Button>
            </Stack>
            <ConfirmSubmitDialog
                open={confirming}
                submitting={submitting}
                onCancel={() => setConfirming(false)}
                onConfirm={() => void send()}
                note="След изпращане отговорът не може да бъде променян. Ще можете да го видите отново на същата връзка."
            >
                <GroupAnswer guests={draft} />
            </ConfirmSubmitDialog>
        </Paper>
    );
}
