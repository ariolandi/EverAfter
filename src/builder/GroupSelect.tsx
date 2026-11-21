import { MenuItem, TextField } from '@mui/material';
import type { Guest, GuestGroup } from '../../shared/types';
import { groupGuestNames } from '../form/guestNames';

interface GroupSelectProps {
    groups: GuestGroup[];
    guests: Guest[];
    /** The group the preview addresses, or null for the general invitation. */
    selectedId: number | null;
    /** The ungrouped guest the preview addresses on their own, if any. */
    selectedGuestId?: number | null;
    onSelect: (groupId: number | null) => void;
    onSelectGuest?: (guestId: number) => void;
}

/** Compact picker of which guest group, or ungrouped guest, the preview greets on its first page. */
export default function GroupSelect({
    groups,
    guests,
    selectedId,
    selectedGuestId = null,
    onSelect,
    onSelectGuest,
}: GroupSelectProps) {
    const grouped = new Set(groups.flatMap((group) => group.guestIds));
    const ungrouped = onSelectGuest ? guests.filter((guest) => !grouped.has(guest.id)) : [];
    const value = selectedGuestId !== null ? `guest:${selectedGuestId}` : selectedId !== null ? `group:${selectedId}` : '';
    return (
        <TextField
            select
            label="Покана за"
            value={value}
            onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                if (kind === 'guest') onSelectGuest?.(Number(id));
                else onSelect(kind === 'group' ? Number(id) : null);
            }}
            size="small"
            fullWidth
            helperText={
                groups.length === 0 && ungrouped.length === 0
                    ? 'Добавете гости или групи гости от страницата на събитието.'
                    : undefined
            }
        >
            <MenuItem value="">Всички гости (обща покана)</MenuItem>
            {groups.map((group) => (
                <MenuItem key={group.id} value={`group:${group.id}`}>
                    {groupGuestNames(group, guests)} · {group.name}
                </MenuItem>
            ))}
            {ungrouped.map((guest) => (
                <MenuItem key={`guest:${guest.id}`} value={`guest:${guest.id}`}>
                    {guest.name}
                </MenuItem>
            ))}
        </TextField>
    );
}
