import { useEffect, useState } from 'react';
import type { GroupInvitation } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import MenuChoice from './MenuChoice';
import RsvpForm from './RsvpForm';
import InvitationForm from './InvitationForm';
import PublicInvitationPage from './PublicInvitationPage';

/** Public page for a guest group's personal link, /g/:token. Shows the group's answer once it has been sent. */
export default function GroupInvite({ token }: { token: string }) {
    const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
    // Reopening an answered link goes straight to the answer instead of the cover page.
    const [answeredOnOpen, setAnsweredOnOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The menu each guest has picked so far, by guest id.
    const [menuChoices, setMenuChoices] = useState<Record<number, number>>({});

    useEffect(() => {
        api.getGroupInvitation(token)
            .then((loaded) => {
                setInvitation(loaded);
                setAnsweredOnOpen(loaded.response !== null);
            })
            .catch((e) => setError(errorMessage(e)));
    }, [token]);

    // The page where guests pick menus only exists when the event has menus.
    const hasMenus = invitation !== null && invitation.menus.length > 0;
    const answeredMenus = Object.fromEntries(
        (invitation?.response?.guests ?? []).flatMap((g) => (g.guestId !== null && g.menuId !== null ? [[g.guestId, g.menuId]] : [])),
    );

    return (
        <PublicInvitationPage error={error}>
            {invitation && (
                <InvitationForm
                    fields={invitation.form}
                    details={invitation.form}
                    imageUrl={invitation.form.imageUrl}
                    schedule={invitation.schedule}
                    menus={invitation.menus}
                    menuSelection={
                        hasMenus && (
                            <MenuChoice
                                guests={invitation.guests}
                                menus={invitation.menus}
                                choices={invitation.response ? answeredMenus : menuChoices}
                                disabled={invitation.response !== null}
                                onChange={(guestId, menuId) => setMenuChoices((c) => ({ ...c, [guestId]: menuId }))}
                            />
                        )
                    }
                    guestNames={invitation.guests.map((guest) => guest.name)}
                    page={answeredOnOpen ? (hasMenus ? 4 : 2) : undefined}
                    responseForm={
                        <RsvpForm
                            fields={invitation.form}
                            guests={invitation.guests}
                            menus={invitation.menus}
                            menuChoices={menuChoices}
                            response={invitation.response}
                            onSubmit={async (answers) => {
                                const response = await api.submitGroupResponse(token, { answers });
                                setInvitation((current) => current && { ...current, response });
                            }}
                        />
                    }
                />
            )}
        </PublicInvitationPage>
    );
}
