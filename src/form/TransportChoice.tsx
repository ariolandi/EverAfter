import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { Transport } from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';
import type { TransportDraft } from './guestChoices';

interface TransportChoiceProps {
    guests: { id: number; name: string }[];
    /** How each guest travels, by guest id. */
    choices: Record<number, TransportDraft>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, transport: TransportDraft | null) => void;
    /** Guests who do not come have nothing to choose. */
    isGuestDisabled?: (guestId: number) => boolean;
    /** Locks the choices once the group's answer has been sent. */
    disabled?: boolean;
}

/** The invitation's transport page: own transport or not, and without one, help or arranging it themselves. */
export default function TransportChoice({ guests, choices, onChange, isGuestDisabled, disabled }: TransportChoiceProps) {
    return (
        <Stack spacing={2}>
            <SectionTitle>Превоз</SectionTitle>
            {guests.map((guest) => {
                const choice = choices[guest.id] ?? null;
                const locked = disabled || !onChange || isGuestDisabled?.(guest.id);
                return (
                    <Stack key={guest.id} spacing={0.75}>
                        <Typography className="guest-name" sx={{ fontWeight: 600 }}>
                            {guest.name}
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            color="primary"
                            aria-label={`Собствен превоз за ${guest.name}`}
                            // Both ways of having no transport of their own count as the second button.
                            value={choice === null ? null : choice === 'own' ? 'own' : 'none'}
                            onChange={(_e, next: 'own' | 'none' | null) => onChange?.(guest.id, next)}
                            disabled={locked}
                        >
                            <ToggleButton value="own">Имам собствен превоз</ToggleButton>
                            <ToggleButton value="none">Нямам собствен превоз</ToggleButton>
                        </ToggleButtonGroup>
                        {choice !== null && choice !== 'own' && (
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size="small"
                                color="primary"
                                aria-label={`Помощ с превоза за ${guest.name}`}
                                value={choice === 'none' ? null : choice}
                                onChange={(_e, next: Transport | null) => onChange?.(guest.id, next ?? 'none')}
                                disabled={locked}
                            >
                                <ToggleButton value="needsHelp">Бих се възползвал от помощ</ToggleButton>
                                <ToggleButton value="arrangesOwn">Ще си осигуря сам</ToggleButton>
                            </ToggleButtonGroup>
                        )}
                    </Stack>
                );
            })}
        </Stack>
    );
}
