import { useState } from 'react';
import { TextField } from '@mui/material';
import { MAX_NAME_LENGTH, MAX_PLACE_LENGTH, type ScheduleItem, type ScheduleItemInput } from '../../shared/types';
import FormDialog from '../components/FormDialog';
import TimeField from '../components/TimeField';
import { useAsyncAction } from '../hooks/useAsyncAction';

interface ScheduleDialogProps {
    /** The schedule item being edited, or null to create a new one. */
    item: ScheduleItem | null;
    onCancel: () => void;
    onSave: (input: ScheduleItemInput) => Promise<void>;
}

/** Creates or edits a part of the schedule: its title, starting hour (24-hour time) and place. */
export default function ScheduleDialog({ item, onCancel, onSave }: ScheduleDialogProps) {
    const [title, setTitle] = useState(item?.title ?? '');
    const [startTime, setStartTime] = useState(item?.startTime ?? '');
    const [place, setPlace] = useState(item?.place ?? '');
    const saving = useAsyncAction();

    const complete = Boolean(title.trim() && startTime && place.trim());

    const save = () => void saving.run(() => onSave({ title: title.trim(), startTime, place: place.trim() }));

    return (
        <FormDialog
            title={item ? 'Редактиране на част от програмата' : 'Нова част от програмата'}
            onCancel={onCancel}
            onSubmit={save}
            canSubmit={complete}
            saving={saving.pending}
            error={saving.error}
        >
            <TextField
                autoFocus
                required
                label="Заглавие"
                placeholder="напр. Церемония"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                fullWidth
                margin="dense"
                disabled={saving.pending}
            />
            <TimeField label="Начален час" value={startTime} onChange={setStartTime} required disabled={saving.pending} />
            <TextField
                required
                label="Място"
                placeholder="напр. Градината на хотела"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                slotProps={{ htmlInput: { maxLength: MAX_PLACE_LENGTH } }}
                fullWidth
                margin="dense"
                disabled={saving.pending}
            />
        </FormDialog>
    );
}
