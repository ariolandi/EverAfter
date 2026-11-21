import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import type { GroupInvitation } from '../../shared/types';
import { api } from '../api';
import GroupRsvpForm from './GroupRsvpForm';
import InvitationForm from './InvitationForm';

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
            .catch((e: Error) => setError(e.message));
    }, [token]);

    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (!invitation) return null;

    const { form } = invitation;

    return (
        <Box sx={{ height: '100dvh', maxWidth: 800, mx: 'auto' }}>
            <InvitationForm
                fields={form}
                details={form}
                imageUrl={form.imageUrl}
                page={answeredOnOpen ? 1 : undefined}
                responseForm={
                    <GroupRsvpForm
                        fields={form}
                        groupName={invitation.groupName}
                        guests={invitation.guests}
                        response={invitation.response}
                        onSubmit={async (answers) => {
                            const response = await api.submitGroupResponse(token, { answers });
                            setInvitation((current) => current && { ...current, response });
                        }}
                    />
                }
            />
        </Box>
    );
}
