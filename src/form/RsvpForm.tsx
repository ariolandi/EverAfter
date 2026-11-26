import { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import {
  MAX_NAME_LENGTH,
  menusForGuest,
  type FormFields,
  type FormResponseInput,
  type GroupGuestAnswer,
  type GuestResponse,
  type Menu,
} from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';
import { ownAnswerLabel } from './answers';
import AttendanceToggle from './AttendanceToggle';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import FormCard from './FormCard';
import GroupAnswer from './GroupAnswer';
import SubmitSuccess from './SubmitSuccess';
import GroupThanks from './GroupThanks';
import { describeChoices, noChoices, type GuestChoices } from './guestChoices';
import { useConfirmedSubmit } from './useConfirmedSubmit';

export type GroupFormPart = 'all' | 'attendance' | 'submit';

type RsvpFormProps = { fields: FormFields } & (
  | {
      /** Omitted for the invitation's general link: the guest types their own name. */
      guests?: undefined;
      responses?: undefined;
      /** Omit to render a non-submittable preview. */
      onSubmit?: (response: FormResponseInput) => Promise<void>;
    }
  | {
      /** The members of a group's personal link: each answers for themselves. */
      guests: { id: number; name: string; isChild?: boolean }[];
      /** The event's menus; each guest who comes picks one on the menu page. */
      menus?: Menu[];
      /**
       * What each guest has picked on the invitation's menu, accommodation and transport pages. Pass it to ask for
       * those: every guest who comes must then have picked an accommodation and transport (and a menu, if any).
       */
      choices?: GuestChoices;
      /**
       * Which part of the group's form to render. The invitation splits it over two pages: 'attendance' where
       * each guest says whether they come, and 'submit' with the send button, after the menus are picked.
       */
      part?: GroupFormPart;
      /** Attendance answers kept by the parent, so both parts of the form share them; omit to keep them here. */
      answers?: Record<number, boolean>;
      onAnswersChange?: (answers: Record<number, boolean>) => void;
      /**
       * The recorded answers of guests who have already answered, by guest id. They are shown selected and
       * locked; only the other guests answer, and once everyone has, the form thanks them instead of sending.
       */
      responses?: Record<number, GuestResponse>;
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
      choices={props.choices}
      part={props.part ?? 'all'}
      answers={props.answers}
      onAnswersChange={props.onAnswersChange}
      responses={props.responses ?? {}}
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
            <AttendanceToggle value={answer} onChange={setAnswer} disabled={submitting} label={ownAnswerLabel} />
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
  choices,
  part,
  answers: controlledAnswers,
  onAnswersChange,
  responses,
  onSubmit,
}: {
  fields: FormFields;
  guests: { id: number; name: string; isChild?: boolean }[];
  menus: Menu[];
  choices?: GuestChoices;
  part: GroupFormPart;
  answers?: Record<number, boolean>;
  onAnswersChange?: (answers: Record<number, boolean>) => void;
  responses: Record<number, GuestResponse>;
  onSubmit?: (answers: GroupGuestAnswer[]) => Promise<void>;
}) {
  const [ownAnswers, setOwnAnswers] = useState<Record<number, boolean>>({});
  const answers = controlledAnswers ?? ownAnswers;
  const setAnswers = onAnswersChange ?? setOwnAnswers;

  const picked = choices ?? noChoices;
  // Guests who have answered are locked to what was recorded; the others are still answering.
  const pending = guests.filter((g) => !(g.id in responses));
  const answerOf = (g: { id: number }) => (g.id in responses ? responses[g.id].answer : answers[g.id]);
  // Only guests who come choose a menu, accommodation and transport; they choose a menu only if one is meant for them.
  const attends = (g: { id: number }) => !fields.showAnswer || answerOf(g) === true;
  const picksMenu = (g: { id: number; isChild?: boolean }) =>
    choices !== undefined && attends(g) && menusForGuest(menus, g.isChild ?? false).length > 0;
  const picksLogistics = (g: { id: number }) => choices !== undefined && attends(g);
  const transportOf = (g: { id: number }) => {
    const transport = picked.transport[g.id];
    return transport === undefined || transport === 'none' ? undefined : transport;
  };
  const complete =
    pending.length > 0 &&
    (!fields.showAnswer || pending.every((g) => g.id in answers)) &&
    pending.every(
      (g) =>
        (!picksMenu(g) || g.id in picked.menus) &&
        (!picksLogistics(g) || (g.id in picked.accommodation && transportOf(g) !== undefined)),
    );
  const draft = pending.map((g) => ({
    name: g.name,
    answer: fields.showAnswer ? (answers[g.id] ?? null) : null,
    extras: describeChoices(menus, {
      menuId: picksMenu(g) ? (picked.menus[g.id] ?? null) : null,
      accommodation: picksLogistics(g) ? (picked.accommodation[g.id] ?? null) : null,
      transport: picksLogistics(g) ? (picked.transport[g.id] ?? null) : null,
      roomWith: picksLogistics(g) && picked.accommodation[g.id] ? (picked.roomWith[g.id] ?? null) : null,
    }),
  }));
  const submission = useConfirmedSubmit(
    complete,
    onSubmit &&
      (() =>
        onSubmit(
          pending.map((g) => ({
            guestId: g.id,
            ...(fields.showAnswer && { answer: answers[g.id] }),
            ...(picksMenu(g) && { menuId: picked.menus[g.id] }),
            ...(picksLogistics(g) && { accommodation: picked.accommodation[g.id], transport: transportOf(g) }),
            ...(picksLogistics(g) && picked.accommodation[g.id] && picked.roomWith[g.id]?.trim() && { roomWith: picked.roomWith[g.id].trim() }),
          })),
        )),
  );
  const { submitting } = submission;

  const setAnswer = (guestId: number, answer: boolean | null) => {
    const next = { ...answers };
    if (answer === null) delete next[guestId];
    else next[guestId] = answer;
    setAnswers(next);
  };

  const allAnswered = guests.length > 0 && pending.length === 0;
  const submitControls = allAnswered ? (
    <GroupThanks plural={guests.length > 1} />
  ) : (
    <>
      {submission.error && <Alert severity="error">{submission.error}</Alert>}
      <Button type="submit" variant="contained" disabled={!onSubmit || !complete || submitting}>
        Изпрати
      </Button>
    </>
  );
  const dialog = (
    <ConfirmSubmitDialog
      {...submission.dialogProps}
      note="След изпращане отговорът не може да бъде променян. Ще можете да го видите отново на същата връзка."
    >
      <GroupAnswer guests={draft} />
    </ConfirmSubmitDialog>
  );

  if (part === 'submit') {
    return (
      <FormCard onSubmit={allAnswered ? undefined : submission.review}>
        <Stack spacing={1.5}>{submitControls}</Stack>
        {dialog}
      </FormCard>
    );
  }

  return (
    <>
      <SectionTitle>{`${guests.length > 1 ? 'Отбележете' : 'Отбележи'} своя отговор`}</SectionTitle>
      <FormCard onSubmit={part === 'all' && !allAnswered ? submission.review : undefined}>
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
                  value={answerOf(guest) ?? null}
                  onChange={(answer) => setAnswer(guest.id, answer)}
                  disabled={submitting || guest.id in responses}
                />
              )}
            </Stack>
          ))}
          {part === 'all' && submitControls}
        </Stack>
        {part === 'all' && dialog}
      </FormCard>
    </>
  );
}
