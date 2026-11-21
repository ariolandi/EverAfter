import { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import type { FormFields, GroupGuestAnswer, GroupResponse } from '../../shared/types';
import { formatLongDate } from '../dates';
import AttendanceToggle from './AttendanceToggle';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import FormCard from './FormCard';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';
import { useConfirmedSubmit } from './useConfirmedSubmit';

interface GroupRsvpFormProps {
    fields: FormFields;
    guests: { id: number; name: string }[];
    /** The group's answer if it has already been sent; the form then only shows it. */
    response: GroupResponse | null;
    /** Omit to render a non-submittable preview, as in the invitation builder. */
    onSubmit?: (answers: GroupGuestAnswer[]) => Promise<void>;
}

/**
 * The answer form of a group's personal link: each guest answers for themselves.
 * The group is greeted by name on the invitation's first page, so the form has no heading of its own.
 */
export default function GroupRsvpForm({ fields, guests, response, onSubmit }: GroupRsvpFormProps) {
    const [answers, setAnswers] = useState<Record<number, boolean>>({});

    const complete = guests.length > 0 && (!fields.showAnswer || guests.every((g) => g.id in answers));
    const draft = guests.map((g) => ({ name: g.name, answer: fields.showAnswer ? (answers[g.id] ?? null) : null }));
    const submission = useConfirmedSubmit(
        complete,
        onSubmit &&
            (() => onSubmit(guests.map((g) => ({ guestId: g.id, ...(fields.showAnswer && { answer: answers[g.id] }) })))),
    );
    const { submitting } = submission;

    const setAnswer = (guestId: number, answer: boolean | null) =>
        setAnswers((current) => {
            const next = { ...current };
            if (answer === null) delete next[guestId];
            else next[guestId] = answer;
            return next;
        });

    if (response) {
        return (
            <FormCard>
                <Stack spacing={1.5}>
                    {submission.sent ? (
                        <SubmitSuccess />
                    ) : (
                        <Alert severity="info">
                            Вече отговорихте на поканата на {formatLongDate(new Date(response.respondedAt))}.
                        </Alert>
                    )}
                    <Typography variant="subtitle2">Вашият отговор</Typography>
                    <GroupAnswer guests={response.guests} />
                </Stack>
            </FormCard>
        );
    }

    return (
        <FormCard onSubmit={submission.review}>
            <Stack spacing={1.5}>
                {guests.length === 0 && <Alert severity="warning">В тази покана все още няма гости.</Alert>}
                {guests.map((guest) => (
                    <Stack key={guest.id} spacing={0.5}>
                        <Typography className="guest-name" sx={{ fontWeight: 600 }}>{guest.name}</Typography>
                        {fields.showAnswer && (
                            <AttendanceToggle
                                aria-label={`Отговор за ${guest.name}`}
                                value={answers[guest.id] ?? null}
                                onChange={(answer) => setAnswer(guest.id, answer)}
                                disabled={submitting}
                            />
                        )}
                    </Stack>
                ))}
                {submission.error && <Alert severity="error">{submission.error}</Alert>}
                <Button type="submit" variant="contained" disabled={!onSubmit || !complete || submitting}>
                    Изпрати
                </Button>
            </Stack>
            <ConfirmSubmitDialog
                {...submission.dialogProps}
                note="След изпращане отговорът не може да бъде променян. Ще можете да го видите отново на същата връзка."
            >
                <GroupAnswer guests={draft} />
            </ConfirmSubmitDialog>
        </FormCard>
    );
}
