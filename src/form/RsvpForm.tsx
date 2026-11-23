import { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import {
    MAX_NAME_LENGTH,
    menusForGuest,
    type FormFields,
    type FormResponseInput,
    type GroupGuestAnswer,
    type GroupResponse,
    type Menu,
} from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';
import { formatLongDate } from '../dates';
import { ownAnswerLabel } from './answers';
import AttendanceToggle from './AttendanceToggle';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import FormCard from './FormCard';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';
import { useConfirmedSubmit } from './useConfirmedSubmit';

type RsvpFormProps = { fields: FormFields } & (
    | {
          /** Omitted for the invitation's general link: the guest types their own name. */
          guests?: undefined;
          response?: undefined;
          /** Omit to render a non-submittable preview. */
          onSubmit?: (response: FormResponseInput) => Promise<void>;
      }
    | {
          /** The members of a group's personal link: each answers for themselves. */
          guests: { id: number; name: string; isChild?: boolean }[];
          /** The event's menus; each guest who comes picks one on the menu page. */
          menus?: Menu[];
          /** The menu picked for each guest so far, by guest id. */
          menuChoices?: Record<number, number>;
          /** The group's answer if it has already been sent; the form then only shows it. */
          response: GroupResponse | null;
          /** Omit to render a non-submittable preview, as in the invitation builder. */
          onSubmit?: (answers: GroupGuestAnswer[]) => Promise<void>;
      }
);

/**
 * The answer form of an invitation. Without `guests` (the general link) the guest types their name and picks
 * whether they'll come; with `guests` (a group's personal link) each guest answers for themselves.
 */
export default function RsvpForm(props: RsvpFormProps) {
    return props.guests ? (
        <GroupForm
            fields={props.fields}
            guests={props.guests}
            menus={props.menus ?? []}
            menuChoices={props.menuChoices ?? {}}
            response={props.response}
            onSubmit={props.onSubmit}
        />
    ) : (
        <SingleForm fields={props.fields} onSubmit={props.onSubmit} />
    );
}

function SingleForm({
    fields,
    onSubmit,
}: {
    fields: FormFields;
    onSubmit?: (response: FormResponseInput) => Promise<void>;
}) {
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
                    answer !== null && <Alert severity="info">{ownAnswerLabel(answer)}</Alert>
                )}
            </ConfirmSubmitDialog>
        </FormCard>
    );
}

/** The group is greeted by name on the invitation's first page, so the form has no heading of its own. */
function GroupForm({
    fields,
    guests,
    menus,
    menuChoices,
    response,
    onSubmit,
}: {
    fields: FormFields;
    guests: { id: number; name: string; isChild?: boolean }[];
    menus: Menu[];
    menuChoices: Record<number, number>;
    response: GroupResponse | null;
    onSubmit?: (answers: GroupGuestAnswer[]) => Promise<void>;
}) {
    const [answers, setAnswers] = useState<Record<number, boolean>>({});

    // Only guests who come choose a menu, and only if one is meant for them.
    const picksMenu = (g: { id: number; isChild?: boolean }) =>
        (!fields.showAnswer || answers[g.id] === true) && menusForGuest(menus, g.isChild ?? false).length > 0;
    const menuName = (g: { id: number }) => menus.find((m) => m.id === menuChoices[g.id])?.name ?? null;
    const complete =
        guests.length > 0 &&
        (!fields.showAnswer || guests.every((g) => g.id in answers)) &&
        guests.every((g) => !picksMenu(g) || g.id in menuChoices);
    const draft = guests.map((g) => ({
        name: g.name,
        answer: fields.showAnswer ? (answers[g.id] ?? null) : null,
        menu: picksMenu(g) ? menuName(g) : null,
    }));
    const submission = useConfirmedSubmit(
        complete,
        onSubmit &&
            (() =>
                onSubmit(
                    guests.map((g) => ({
                        guestId: g.id,
                        ...(fields.showAnswer && { answer: answers[g.id] }),
                        ...(picksMenu(g) && { menuId: menuChoices[g.id] }),
                    })),
                )),
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
                    <GroupAnswer guests={response.guests.map((g) => ({ ...g, menu: menus.find((m) => m.id === g.menuId)?.name }))} />
                </Stack>
            </FormCard>
        );
    }

    return (
        <>
            <SectionTitle>{`${guests.length > 1 ? 'Отбележете' : 'Отбележи'} своя отговор`}</SectionTitle>
            <FormCard onSubmit={submission.review}>
                <Stack spacing={1.5}>
                    {guests.length === 0 && <Alert severity="warning">В тази покана все още няма гости.</Alert>}
                    {guests.map((guest) => (
                        <Stack key={guest.id} spacing={0.5}>
                            <Typography className="guest-name" sx={{ fontWeight: 600 }}>
                                {guest.name}
                            </Typography>
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
        </>
    );
}
