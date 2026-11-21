import { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { MAX_NAME_LENGTH, type FormFields, type FormResponseInput } from '../../shared/types';
import { answerLabel, ownAnswerLabel } from './answers';
import AttendanceToggle from './AttendanceToggle';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import FormCard from './FormCard';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';
import { useConfirmedSubmit } from './useConfirmedSubmit';

interface RsvpFormProps {
    fields: FormFields;
    /** Omit to render a non-submittable preview. */
    onSubmit?: (response: FormResponseInput) => Promise<void>;
}

/** The answer form of the invitation's general link: the guest types their name and picks whether they'll come. */
export default function RsvpForm({ fields, onSubmit }: RsvpFormProps) {
    const [name, setName] = useState('');
    const [answer, setAnswer] = useState<boolean | null>(null);

    const complete = (!fields.showName || name.trim() !== '') && (!fields.showAnswer || answer !== null);
    const submission = useConfirmedSubmit(
        complete,
        onSubmit &&
            (() =>
                onSubmit({
                    ...(fields.showName && { name: name.trim() }),
                    ...(fields.showAnswer && answer !== null && { answer }),
                })),
    );
    const { submitting } = submission;

    return (
        <FormCard onSubmit={submission.review}>
            {submission.sent ? (
                <SubmitSuccess />
            ) : (
                <Stack spacing={1.5}>
                    {fields.showName && (
                        <TextField
                            required
                            label="Вашето име"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                            size="small"
                            fullWidth
                            disabled={submitting}
                        />
                    )}
                    {fields.showAnswer && (
                        <AttendanceToggle
                            value={answer}
                            onChange={setAnswer}
                            disabled={submitting}
                            label={ownAnswerLabel}
                        />
                    )}
                    {submission.error && <Alert severity="error">{submission.error}</Alert>}
                    <Button type="submit" variant="contained" disabled={!onSubmit || !complete || submitting}>
                        Изпрати
                    </Button>
                </Stack>
            )}
            <ConfirmSubmitDialog {...submission.dialogProps}>
                {fields.showName ? (
                    <GroupAnswer guests={[{ name: name.trim(), answer: fields.showAnswer ? answer : null }]} />
                ) : (
                    answer !== null && <Alert severity="info">{answerLabel(answer)}</Alert>
                )}
            </ConfirmSubmitDialog>
        </FormCard>
    );
}
