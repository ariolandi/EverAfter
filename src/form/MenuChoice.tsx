import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { MAX_GUEST_NOTES_LENGTH, menusForGuest, type Menu } from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';

interface MenuChoiceProps {
    guests: { id: number; name: string; isChild?: boolean }[];
    menus: Menu[];
    /** The menu picked for each guest, by guest id. */
    choices: Record<number, number>;
    /** The note each guest left, e.g. about dietary restrictions, by guest id. */
    notes?: Record<number, string>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, menuId: number) => void;
    onNotesChange?: (guestId: number, notes: string) => void;
    /** Guests who do not come have nothing to choose. */
    isGuestDisabled?: (guestId: number) => boolean;
    /** Locks the choices once the group's answer has been sent. */
    disabled?: boolean;
}

/** The invitation's menu page: every guest picks a menu; children's menus are offered to children only. */
export default function MenuChoice({
    guests,
    menus,
    choices,
    notes = {},
    onChange,
    onNotesChange,
    isGuestDisabled,
    disabled,
}: MenuChoiceProps) {
    return (
        <Stack spacing={2}>
            <SectionTitle>{guests.length > 1 ? 'Изберете меню' : 'Избери меню'}</SectionTitle>
            {guests.map((guest) => {
                const options = menusForGuest(menus, guest.isChild ?? false);
                return (
                    <Stack key={guest.id} spacing={0.5}>
                        <Typography className="guest-name" sx={{ fontWeight: 600 }}>
                            {guest.name}
                        </Typography>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            label={'Меню'}
                            value={choices[guest.id] ?? ''}
                            onChange={(e) => onChange?.(guest.id, Number(e.target.value))}
                            disabled={disabled || !onChange || options.length === 0 || isGuestDisabled?.(guest.id)}
                        >
                            {options.map((menu) => (
                                <MenuItem key={menu.id} value={menu.id}>
                                    {menu.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            label="Бележки (напр. хранителни ограничения или алергии)"
                            value={notes[guest.id] ?? ''}
                            onChange={(e) => onNotesChange?.(guest.id, e.target.value)}
                            disabled={disabled || !onChange || isGuestDisabled?.(guest.id)}
                            slotProps={{ htmlInput: { maxLength: MAX_GUEST_NOTES_LENGTH } }}
                        />
                    </Stack>
                );
            })}
        </Stack>
    );
}
