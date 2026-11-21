import { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { MAX_NAME_LENGTH, type Guest, type GuestGroup, type GuestGroupInput } from '../../shared/types';
import FormDialog from '../components/FormDialog';
import { useAsyncAction } from '../hooks/useAsyncAction';

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
    const saving = useAsyncAction();

    const groupOf = (guest: Guest) => groups.find((g) => g.id !== group?.id && g.guestIds.includes(guest.id));

    const save = () => void saving.run(() => onSave({ name: name.trim(), guestIds: members.map((m) => m.id) }));

    return (
        <FormDialog
            title={group ? 'Редактиране на група' : 'Нова група'}
            onCancel={onCancel}
            onSubmit={save}
            canSubmit={Boolean(name.trim()) && members.length > 0}
            saving={saving.pending}
            error={saving.error}
        >
            <TextField
                autoFocus
                required
                label="Име на групата"
                placeholder="напр. Семейство Иванови"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                fullWidth
                margin="dense"
                disabled={saving.pending}
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
                disabled={saving.pending}
                noOptionsText="Първо добавете гости в списъка"
                renderInput={(params) => <TextField {...params} label="Гости" margin="dense" />}
            />
        </FormDialog>
    );
}
