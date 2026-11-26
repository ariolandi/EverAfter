import { Stack, Typography } from '@mui/material';
import { SectionTitle } from '../components/SectionTitle';
import type { TransportDraft } from './guestChoices';
import TransportPicker from './TransportPicker';

interface TransportChoiceProps {
    guests: { id: number; name: string }[];
    /** The organiser's note, shown above the choices. */
    notes?: string;
    /** How each guest travels, by guest id. */
    choices: Record<number, TransportDraft>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, transport: TransportDraft | null) => void;
    /** Guests who do not come, or have already answered, have nothing to choose. */
    isGuestDisabled?: (guestId: number) => boolean;
    disabled?: boolean;
}

/** The invitation's transport page: each guest says how they get to the event. */
export default function TransportChoice({ guests, notes, choices, onChange, isGuestDisabled, disabled }: TransportChoiceProps) {
    return (
        <Stack spacing={2}>
            <SectionTitle>Превоз</SectionTitle>
            {notes && <Typography sx={{ whiteSpace: 'pre-line' }}>{notes}</Typography>}
            {guests.map((guest) => (
                <Stack key={guest.id} spacing={0.75}>
                    <Typography className="guest-name" sx={{ fontWeight: 600 }}>
                        {guest.name}
                    </Typography>
                    <TransportPicker
                        guestName={guest.name}
                        value={choices[guest.id] ?? null}
                        onChange={onChange && ((transport) => onChange(guest.id, transport))}
                        disabled={disabled || isGuestDisabled?.(guest.id)}
                    />
                </Stack>
            ))}
        </Stack>
    );
}
