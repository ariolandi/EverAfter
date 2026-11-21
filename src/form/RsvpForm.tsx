import { useState, type FormEvent } from 'react';
import { Alert, Button, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { FormFields, FormResponseInput } from '../../shared/types';
import { answerLabel } from './answers';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';

interface RsvpFormProps {
    fields: FormFields;
    /** Omit to render a non-submittable preview. */
    onSubmit?: (response: FormResponseInput) => Promise<void>;
}

/** The answer form of the invitation's general link: the guest types their name and picks whether they'll come. */
export default function RsvpForm({ fields, onSubmit }: RsvpFormProps) {
    const [name, setName] = useState('');
    const [answer, setAnswer] = useState<boolean | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const complete = (!fields.showName || name.trim() !== '') && (!fields.showAnswer || answer !== null);

    const review = (event: FormEvent) => {
        event.preventDefault();
        if (onSubmit && complete) setConfirming(true);
    };

    const send = async () => {
        if (!onSubmit) return;
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
            setConfirming(false);
        }
    };

    return (
        <Paper component="form" onSubmit={review} sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
            {submitted ? (
                <SubmitSuccess />
            ) : (
                <Stack spacing={1.5}>
                    {fields.showName && (
                        <TextField
                            required
                            label="Вашето име"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            size="small"
                            fullWidth
                            disabled={submitting}
                        />
                    )}
                    {fields.showAnswer && (
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            color="primary"
                            value={answer}
                            onChange={(_e, value: boolean | null) => setAnswer(value)}
                            disabled={submitting}
                        >
                            <ToggleButton value={true}>Ще присъствам</ToggleButton>
                            <ToggleButton value={false}>Няма да присъствам</ToggleButton>
                        </ToggleButtonGroup>
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button type="submit" variant="contained" disabled={!onSubmit || !complete || submitting}>
                        Изпрати
                    </Button>
                </Stack>
            )}
            <ConfirmSubmitDialog
                open={confirming}
                submitting={submitting}
                onCancel={() => setConfirming(false)}
                onConfirm={() => void send()}
            >
                {fields.showName ? (
                    <GroupAnswer guests={[{ name: name.trim(), answer: fields.showAnswer ? answer : null }]} />
                ) : (
                    answer !== null && <Alert severity="info">{answerLabel(answer)}</Alert>
                )}
            </ConfirmSubmitDialog>
        </Paper>
    );
}
