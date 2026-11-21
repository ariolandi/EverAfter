import { useState, type FormEvent } from 'react';
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import type { Guest, GuestGroup, GuestGroupInput } from '../../shared/types';

interface GroupDialogProps {
    /** The group being edited, or null to create a new one. */
    group: GuestGroup | null;
    /** The event's guest list. */
    guests: Guest[];
    /** Every group of the event, so guests already in another group can be marked. */
    groups: GuestGroup[];
    onCancel: () => void;
    onSave: (input: GuestGroupInput) => Promise<void>;
}

/**
 * Creates or edits a guest group: its name and who is in it. Picking a guest who is already in another group moves
 * them here. Render it with a `key` per group so its fields start from that group.
 */
export default function GroupDialog({ group, guests, groups, onCancel, onSave }: GroupDialogProps) {
    const [name, setName] = useState(group?.name ?? '');
    const [members, setMembers] = useState<Guest[]>(() => guests.filter((g) => group?.guestIds.includes(g.id)));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const groupOf = (guest: Guest) => groups.find((g) => g.id !== group?.id && g.guestIds.includes(guest.id));

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim() || members.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await onSave({ name: name.trim(), guestIds: members.map((m) => m.id) });
        } catch (e) {
            setError((e as Error).message);
            setSaving(false);
        }
    };

    return (
        <Dialog
            open
            onClose={onCancel}
            fullWidth
            maxWidth="sm"
            slotProps={{ paper: { component: 'form', onSubmit: save } }}
        >
            <DialogTitle>{group ? 'Редактиране на група' : 'Нова група'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    label="Име на групата"
                    placeholder="напр. Семейство Иванови"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    fullWidth
                    margin="dense"
                    disabled={saving}
                />
                <Autocomplete
                    multiple
                    options={guests}
                    value={members}
                    onChange={(_e, value) => setMembers(value)}
                    getOptionLabel={(guest) => guest.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={({ key, ...props }, guest) => {
                        const other = groupOf(guest);
                        return (
                            <li key={key} {...props}>
                                {other ? `${guest.name} (в „${other.name}“)` : guest.name}
                            </li>
                        );
                    }}
                    disabled={saving}
                    noOptionsText="Първо добавете гости в списъка"
                    renderInput={(params) => <TextField {...params} label="Гости" margin="dense" />}
                />
                {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Отказ</Button>
                <Button type="submit" variant="contained" disabled={saving || !name.trim() || members.length === 0}>
                    Запази
                </Button>
            </DialogActions>
        </Dialog>
    );
}
