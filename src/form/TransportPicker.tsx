import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { Transport } from '../../shared/types';
import type { TransportDraft } from './guestChoices';

interface TransportPickerProps {
    /** Names the guest the answer is for, for screen readers. */
    guestName: string;
    value: TransportDraft | null;
    onChange?: (transport: TransportDraft | null) => void;
    disabled?: boolean;
}

/** One guest's transport answer: own transport or not, and without one, help or arranging it themselves. */
export default function TransportPicker({ guestName, value, onChange, disabled }: TransportPickerProps) {
    return (
        <Stack spacing={0.75}>
            <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                color="primary"
                aria-label={`Собствен превоз за ${guestName}`}
                // Both ways of having no transport of their own count as the second button.
                value={value === null ? null : value === 'own' ? 'own' : 'none'}
                onChange={(_e, next: 'own' | 'none' | null) => onChange?.(next)}
                disabled={disabled || !onChange}
            >
                <ToggleButton value="own">Имам собствен превоз</ToggleButton>
                <ToggleButton value="none">Нямам собствен превоз</ToggleButton>
            </ToggleButtonGroup>
            {value !== null && value !== 'own' && (
                <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    color="primary"
                    aria-label={`Помощ с превоза за ${guestName}`}
                    value={value === 'none' ? null : value}
                    onChange={(_e, next: Transport | null) => onChange?.(next ?? 'none')}
                    disabled={disabled || !onChange}
                >
                    <ToggleButton value="needsHelp">Бих се възползвал от помощ</ToggleButton>
                    <ToggleButton value="arrangesOwn">Ще си осигуря сам</ToggleButton>
                </ToggleButtonGroup>
            )}
        </Stack>
    );
}
