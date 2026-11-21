import { MenuItem, TextField } from '@mui/material';
import type { Guest, GuestGroup } from '../../shared/types';
import { groupGuestNames } from '../form/guestNames';

interface GroupSelectProps {
    groups: GuestGroup[];
    guests: Guest[];
    /** The group the preview addresses, or null for the general invitation. */
    selectedId: number | null;
    onSelect: (groupId: number | null) => void;
}

/** Compact picker of which guest group the preview greets on its first page. */
export default function GroupSelect({ groups, guests, selectedId, onSelect }: GroupSelectProps) {
    return (
        <TextField
            select
            label="Покана за"
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value === '' ? null : Number(e.target.value))}
            size="small"
            fullWidth
            helperText={groups.length === 0 ? 'Добавете групи гости от страницата на събитието.' : undefined}
        >
            <MenuItem value="">Всички гости (обща покана)</MenuItem>
            {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                    {groupGuestNames(group, guests)} · {group.name}
                </MenuItem>
            ))}
        </TextField>
    );
}
