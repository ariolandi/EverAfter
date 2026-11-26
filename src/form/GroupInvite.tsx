import { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import type { GroupGuestAnswer, GroupInvitation, GuestResponse } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import AccommodationChoice from './AccommodationChoice';
import { choicesFromResponses, noChoices, type GuestChoices } from './guestChoices';
import MenuChoice from './MenuChoice';
import TransportChoice from './TransportChoice';
import RsvpForm, { type GroupFormPart } from './RsvpForm';
import InvitationForm from './InvitationForm';
import PublicInvitationPage from './PublicInvitationPage';

/** Which personal link the page was opened from: a guest group's, /g/:token, or a single guest's, /i/:token. */
export type InviteKind = 'group' | 'guest';

/**
 * Public page for a personal invitation link. Guests who have answered see the invitation read-only with their
 * answers selected; the others can still answer, and a final page sends their answer.
 */
export default function GroupInvite({ token, kind = 'group' }: { token: string; kind?: InviteKind }) {
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Whether each guest comes, and what they picked on the choice pages; kept here because the pages are separate.
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [choices, setChoices] = useState<GuestChoices>(noChoices);

  useEffect(() => {
    (kind === 'guest' ? api.getGuestInvitation(token) : api.getGroupInvitation(token))
      .then(setInvitation)
      .catch((e) => setError(errorMessage(e)));
  }, [token, kind]);

  const submit = async (groupAnswers: GroupGuestAnswer[]) => {
    const input = { answers: groupAnswers };
    setInvitation(
      await (kind === 'guest' ? api.submitGuestResponse(token, input) : api.submitGroupResponse(token, input)),
    );
  };

  if (!invitation) return <PublicInvitationPage error={error}>{null}</PublicInvitationPage>;

  const responses: Record<number, GuestResponse> = Object.fromEntries(
    invitation.guests.flatMap((g) => (g.response ? [[g.id, g.response]] : [])),
  );
  // What a guest picked, once they have answered, replaces what is still being filled in.
  const recorded = choicesFromResponses(responses);
  const shown: GuestChoices = {
    menus: { ...choices.menus, ...recorded.menus },
    accommodation: { ...choices.accommodation, ...recorded.accommodation },
    transport: { ...choices.transport, ...recorded.transport },
    roomWith: { ...choices.roomWith, ...recorded.roomWith },
  };
  // Guests who have answered are locked, and so are those who answered that they will not come.
  const locked = (guestId: number) =>
    guestId in responses || (invitation.form.showAnswer && answers[guestId] === false);
  const update = <K extends keyof GuestChoices>(key: K, guestId: number, value: GuestChoices[K][number] | null) =>
    setChoices((current) => {
      const next = { ...current[key] } as Record<number, unknown>;
      if (value === null) delete next[guestId];
      else next[guestId] = value;
      return { ...current, [key]: next };
    });

  const rsvp = (part: GroupFormPart) => (
    <RsvpForm
      fields={invitation.form}
      guests={invitation.guests}
      menus={invitation.menus}
      choices={choices}
      part={part}
      answers={answers}
      onAnswersChange={setAnswers}
      responses={responses}
      onSubmit={submit}
    />
  );

  // The choice pages follow the menus, in this order; the send button is on the last one.
  const guestPages = [
    ...(invitation.menus.length > 0
      ? [
          <MenuChoice
            key="menu"
            guests={invitation.guests}
            menus={invitation.menus}
            choices={shown.menus}
            isGuestDisabled={locked}
            onChange={(guestId, menuId) => update('menus', guestId, menuId)}
          />,
        ]
      : []),
    <AccommodationChoice
      key="accommodation"
      guests={invitation.guests}
      notes={invitation.form.accommodationNotes}
      choices={shown.accommodation}
      roomWith={shown.roomWith}
      onRoomWithChange={(guestId, name) => update('roomWith', guestId, name || null)}
      isGuestDisabled={locked}
      onChange={(guestId, uses) => update('accommodation', guestId, uses)}
    />,
    <Stack key="transport" spacing={2}>
      <TransportChoice
        guests={invitation.guests}
        notes={invitation.form.transportNotes}
        choices={shown.transport}
        isGuestDisabled={locked}
        onChange={(guestId, transport) => update('transport', guestId, transport)}
      />
      {rsvp('submit')}
    </Stack>,
  ];

  return (
    <PublicInvitationPage error={error}>
      <InvitationForm
        fields={invitation.form}
        eventName={invitation.eventName}
        details={invitation.form}
        imageUrl={invitation.form.imageUrl}
        schedule={invitation.schedule}
        menus={invitation.menus}
        guestPages={guestPages}
        guestNames={invitation.guests.map((guest) => guest.name)}
        responseForm={rsvp('attendance')}
        envelope
      />
    </PublicInvitationPage>
  );
}
