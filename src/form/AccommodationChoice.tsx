import { Stack, Typography } from '@mui/material';
import { SectionTitle } from '../components/SectionTitle';
import AttendanceToggle from './AttendanceToggle';
import { ACCOMMODATION_LABELS } from './guestChoices';

interface AccommodationChoiceProps {
    guests: { id: number; name: string }[];
    /** Whether each guest will use the accommodation, by guest id. */
    choices: Record<number, boolean>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, uses: boolean | null) => void;
    /** Guests who do not come have nothing to choose. */
    isGuestDisabled?: (guestId: number) => boolean;
    /** Locks the choices once the group's answer has been sent. */
    disabled?: boolean;
}

/** The invitation's accommodation page: each guest says whether they will stay the night. */
export default function AccommodationChoice({
    guests,
    choices,
    onChange,
    isGuestDisabled,
    disabled,
}: AccommodationChoiceProps) {
    return (
        <Stack spacing={2}>
            <SectionTitle>Нощувки</SectionTitle>
            {guests.map((guest) => (
                <Stack key={guest.id} spacing={0.5}>
                    <Typography className="guest-name" sx={{ fontWeight: 600 }}>
                        {guest.name}
                    </Typography>
                    <AttendanceToggle
                        aria-label={`Нощувка за ${guest.name}`}
                        value={choices[guest.id] ?? null}
                        onChange={(uses) => onChange?.(guest.id, uses)}
                        disabled={disabled || !onChange || isGuestDisabled?.(guest.id)}
                        label={(uses) => (uses ? ACCOMMODATION_LABELS.yes : ACCOMMODATION_LABELS.no)}
                    />
                </Stack>
            ))}
        </Stack>
    );
}
