import { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import type { GroupGuestAnswer, GroupInvitation } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import AccommodationChoice from './AccommodationChoice';
import { choicesFromResponse, noChoices, type GuestChoices } from './guestChoices';
import MenuChoice from './MenuChoice';
import TransportChoice from './TransportChoice';
import RsvpForm, { type GroupFormPart } from './RsvpForm';
import InvitationForm from './InvitationForm';
import PublicInvitationPage from './PublicInvitationPage';

/** Public page for a guest group's personal link, /g/:token. Shows the group's answer once it has been sent. */
export default function GroupInvite({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  // Reopening an answered link goes straight to the answer instead of the cover page.
  const [answeredOnOpen, setAnsweredOnOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether each guest comes, and what they picked on the choice pages; kept here because the pages are separate.
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [choices, setChoices] = useState<GuestChoices>(noChoices);

  useEffect(() => {
    api
      .getGroupInvitation(token)
      .then((loaded) => {
        setInvitation(loaded);
        setAnsweredOnOpen(loaded.response !== null);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [token]);

  const submitGroup = async (groupAnswers: GroupGuestAnswer[]) => {
    const response = await api.submitGroupResponse(token, { answers: groupAnswers });
    setInvitation((current) => current && { ...current, response });
  };

  if (!invitation) return <PublicInvitationPage error={error}>{null}</PublicInvitationPage>;

  const { response } = invitation;
  // Once the answer is sent the pages show what was recorded, locked.
  const shown = response ? choicesFromResponse(response) : choices;
  // Guests who answered that they will not come have nothing to choose.
  const declined = (guestId: number) => invitation.form.showAnswer && answers[guestId] === false;
  const locked = response !== null;
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
      response={response}
      onSubmit={submitGroup}
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
            disabled={locked}
            isGuestDisabled={declined}
            onChange={(guestId, menuId) => update('menus', guestId, menuId)}
          />,
        ]
      : []),
    <AccommodationChoice
      key="accommodation"
      guests={invitation.guests}
      choices={shown.accommodation}
      disabled={locked}
      isGuestDisabled={declined}
      onChange={(guestId, uses) => update('accommodation', guestId, uses)}
    />,
    <Stack key="transport" spacing={2}>
      <TransportChoice
        guests={invitation.guests}
        choices={shown.transport}
        disabled={locked}
        isGuestDisabled={declined}
        onChange={(guestId, transport) => update('transport', guestId, transport)}
      />
      {rsvp('submit')}
    </Stack>,
  ];

  return (
    <PublicInvitationPage error={error}>
      <InvitationForm
        fields={invitation.form}
        details={invitation.form}
        imageUrl={invitation.form.imageUrl}
        schedule={invitation.schedule}
        menus={invitation.menus}
        guestPages={guestPages}
        guestNames={invitation.guests.map((guest) => guest.name)}
        // Reopening an answered link shows the answer, which is the third page.
        page={answeredOnOpen ? 2 : undefined}
        responseForm={rsvp('attendance')}
      />
    </PublicInvitationPage>
  );
}
