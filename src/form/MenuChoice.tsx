import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { menusForGuest, type Menu } from '../../shared/types';
import { SectionTitle } from '../components/SectionTitle';

interface MenuChoiceProps {
    guests: { id: number; name: string; isChild?: boolean }[];
    menus: Menu[];
    /** The menu picked for each guest, by guest id. */
    choices: Record<number, number>;
    /** Omit to render a non-interactive preview, as in the invitation builder. */
    onChange?: (guestId: number, menuId: number) => void;
    /** Locks the choices once the group's answer has been sent. */
    disabled?: boolean;
}

/** The invitation's menu page: every guest picks a menu; children's menus are offered to children only. */
export default function MenuChoice({ guests, menus, choices, onChange, disabled }: MenuChoiceProps) {
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
                            disabled={disabled || !onChange || options.length === 0}
                        >
                            {options.map((menu) => (
                                <MenuItem key={menu.id} value={menu.id}>
                                    {menu.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                );
            })}
        </Stack>
    );
}
