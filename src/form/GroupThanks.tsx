import { Alert } from '@mui/material';

/**
 * Shown once everyone on a personal link has answered: right after sending, and whenever the link is opened again,
 * when the invitation is read-only with the answers selected. Addressed to the group in the plural, to a single
 * guest informally.
 */
export default function GroupThanks({ plural }: { plural: boolean }) {
    return (
        <Alert severity="success" role="status">
            {plural
                ? 'Благодарим ви! Можете да преглеждате информацията по всяко време, както и своите отговори.'
                : 'Благодарим ти! Можеш да преглеждаш информацията по всяко време, както и своите отговори.'}
        </Alert>
    );
}
