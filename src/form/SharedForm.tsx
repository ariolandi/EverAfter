import { useEffect, useState } from 'react';
import type { PublishedForm } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../errors';
import InvitationForm from './InvitationForm';
import PublicInvitationPage from './PublicInvitationPage';

/** Public page for a published form, opened from a /f/:slug share link. */
export default function SharedForm({ slug }: { slug: string }) {
    const [form, setForm] = useState<PublishedForm | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getForm(slug)
            .then(setForm)
            .catch((e) => setError(errorMessage(e)));
    }, [slug]);

    return (
        <PublicInvitationPage error={error}>
            {form && (
                <InvitationForm
                    fields={form}
                    details={form}
                    imageUrl={form.imageUrl}
                    onSubmit={(response) => api.submitFormResponse(slug, response)}
                />
            )}
        </PublicInvitationPage>
    );
}
