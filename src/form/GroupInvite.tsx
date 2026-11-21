import { useEffect, useState } from 'react';
import type { GroupInvitation } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import GroupRsvpForm from './GroupRsvpForm';
import InvitationForm from './InvitationForm';
import PublicInvitationPage from './PublicInvitationPage';

/** Public page for a guest group's personal link, /g/:token. Shows the group's answer once it has been sent. */
export default function GroupInvite({ token }: { token: string }) {
    const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
    // Reopening an answered link goes straight to the answer instead of the cover page.
    const [answeredOnOpen, setAnsweredOnOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getGroupInvitation(token)
            .then((loaded) => {
                setInvitation(loaded);
                setAnsweredOnOpen(loaded.response !== null);
            })
            .catch((e) => setError(errorMessage(e)));
    }, [token]);

    return (
        <PublicInvitationPage error={error}>
            {invitation && (
                <InvitationForm
                    fields={invitation.form}
                    details={invitation.form}
                    imageUrl={invitation.form.imageUrl}
                    guestNames={invitation.guests.map((guest) => guest.name)}
                    page={answeredOnOpen ? 1 : undefined}
                    responseForm={
                        <GroupRsvpForm
                            fields={invitation.form}
                            guests={invitation.guests}
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
