import { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import type { SharedInvitation } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import AccommodationChoice from './AccommodationChoice';
import type { GuestChoices } from './guestChoices';
import InvitationForm from './InvitationForm';
import MenuChoice from './MenuChoice';
import PublicInvitationPage from './PublicInvitationPage';
import RsvpForm, { emptyDraft, SELF_ID, type SingleDraft } from './RsvpForm';
import TransportChoice from './TransportChoice';

/** Public page for a published form, opened from a /f/:slug share link. */
export default function SharedForm({ slug }: { slug: string }) {
    const [form, setForm] = useState<SharedInvitation | null>(null);
    const [error, setError] = useState<string | null>(null);
    // What the guest typed and picked; kept here because the answer and the choices are on separate pages.
    const [draft, setDraft] = useState<SingleDraft>(emptyDraft);

    useEffect(() => {
        api.getForm(slug)
            .then(setForm)
            .catch((e) => setError(errorMessage(e)));
    }, [slug]);

    if (!form) return <PublicInvitationPage error={error}>{null}</PublicInvitationPage>;

    // The guest is the only one on the choice pages; they are named by what they typed.
    const guests = [{ id: SELF_ID, name: draft.name.trim() || 'Вие' }];
    const declined = form.showAnswer && draft.answer === false;
    const update = <K extends keyof GuestChoices>(key: K, value: GuestChoices[K][number] | null) => {
        const next = { ...draft.choices[key] } as Record<number, unknown>;
        if (value === null) delete next[SELF_ID];
        else next[SELF_ID] = value;
        setDraft({ ...draft, choices: { ...draft.choices, [key]: next } });
    };
    const rsvp = (part: 'attendance' | 'submit') => (
        <RsvpForm
            fields={form}
            menus={form.menus}
            part={part}
            draft={draft}
            onDraftChange={setDraft}
            withChoices
            onSubmit={(response) => api.submitFormResponse(slug, response)}
        />
    );

    const guestPages = [
        ...(form.menus.length > 0
            ? [
                  <MenuChoice
                      key="menu"
                      guests={guests}
                      menus={form.menus}
                      choices={draft.choices.menus}
                      isGuestDisabled={() => declined}
                      onChange={(_, menuId) => update('menus', menuId)}
                  />,
              ]
            : []),
        <AccommodationChoice
            key="accommodation"
            guests={guests}
            notes={form.accommodationNotes}
            choices={draft.choices.accommodation}
            roomWith={draft.choices.roomWith}
            onRoomWithChange={(_, name) => update('roomWith', name || null)}
            isGuestDisabled={() => declined}
            onChange={(_, uses) => update('accommodation', uses)}
        />,
        <Stack key="transport" spacing={2}>
            <TransportChoice
                guests={guests}
                notes={form.transportNotes}
                choices={draft.choices.transport}
                isGuestDisabled={() => declined}
                onChange={(_, transport) => update('transport', transport)}
            />
            {rsvp('submit')}
        </Stack>,
    ];

    return (
        <PublicInvitationPage error={error}>
            <InvitationForm
                fields={form}
                eventName={form.eventName}
                details={form}
                imageUrl={form.imageUrl}
                schedule={form.schedule}
                menus={form.menus}
                guestPages={guestPages}
                responseForm={rsvp('attendance')}
                envelope
            />
        </PublicInvitationPage>
    );
}
