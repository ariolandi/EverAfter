import { Stack, TextField, Typography } from '@mui/material';
import { MAX_ROOM_WITH_LENGTH } from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';
import AttendanceToggle from './AttendanceToggle';
import { ACCOMMODATION_LABELS } from './guestChoices';

interface AccommodationChoiceProps {
    guests: { id: number; name: string }[];
    /** The organiser's note, shown above the choices. */
    notes?: string;
    /** Whether each guest will use the accommodation, by guest id. */
    choices: Record<number, boolean>;
    /** Who each guest would like to share a room with, by guest id. */
    roomWith?: Record<number, string>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, uses: boolean | null) => void;
    onRoomWithChange?: (guestId: number, name: string) => void;
    /** Guests who do not come have nothing to choose. */
    isGuestDisabled?: (guestId: number) => boolean;
    /** Locks the choices once the group's answer has been sent. */
    disabled?: boolean;
}

/** The invitation's accommodation page: each guest says whether they will stay the night. */
export default function AccommodationChoice({
    guests,
    notes,
    choices,
    roomWith = {},
    onChange,
    onRoomWithChange,
    isGuestDisabled,
    disabled,
}: AccommodationChoiceProps) {
    return (
        <Stack spacing={2}>
            <SectionTitle>Нощувки</SectionTitle>
            {notes && <Typography sx={{ whiteSpace: 'pre-line' }}>{notes}</Typography>}
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
                    {/* A guest invited on their own may ask to share a room with someone. */}
                    {guests.length === 1 && (!onChange || choices[guest.id] === true) && (
                        <TextField
                            size="small"
                            label="С кого предпочиташ да споделиш стая?"
                            value={roomWith[guest.id] ?? ''}
                            onChange={(e) => onRoomWithChange?.(guest.id, e.target.value)}
                            disabled={disabled || !onChange || isGuestDisabled?.(guest.id)}
                            slotProps={{ htmlInput: { maxLength: MAX_ROOM_WITH_LENGTH } }}
                        />
                    )}
                </Stack>
            ))}
        </Stack>
    );
}
