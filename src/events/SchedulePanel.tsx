import { useEffect, useState } from 'react';
import { Alert, Button, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import type { ScheduleItem, ScheduleItemInput } from '../../shared/types';
import { api } from '../api';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import ItemCard from '../components/ItemCard';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import { errorMessage } from '../errors';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import ScheduleDialog from './ScheduleDialog';

interface SchedulePanelProps {
    eventId: number;
}

/** In the order the parts take place; matches the order the server lists them in. */
const sortSchedule = (list: ScheduleItem[]) =>
    [...list].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id);

/** The event's programme: each part has a title, a starting hour and a place. */
export default function SchedulePanel({ eventId }: SchedulePanelProps) {
    const [items, setItems] = useState<ScheduleItem[]>([]);
    // The item being edited in the dialog: 'new' to create one, null when the dialog is closed.
    const [editing, setEditing] = useState<ScheduleItem | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const deletion = useConfirmDelete(async (item: ScheduleItem) => {
        await api.deleteScheduleItem(eventId, item.id);
        setItems((current) => current.filter((i) => i.id !== item.id));
    });

    useEffect(() => {
        api.listSchedule(eventId)
            .then(setItems)
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    const save = async (input: ScheduleItemInput) => {
        const saved =
            editing === 'new' || editing === null
                ? await api.createScheduleItem(eventId, input)
                : await api.updateScheduleItem(eventId, editing.id, input);
        setItems((current) => sortSchedule([...current.filter((i) => i.id !== saved.id), saved]));
        setEditing(null);
    };

    return (
        <Panel
            collapsible
            title={`Програма (${items.length})`}
            action={
                <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>
                    Нова част
                </Button>
            }
            description="Добавете частите на събитието, всяка със заглавие, начален час и място."
        >
            {error && <Alert severity="error">{error}</Alert>}
            {items.length === 0 ? (
                <MutedText>Все още няма добавена програма.</MutedText>
            ) : (
                items.map((item) => (
                    <ItemCard
                        key={item.id}
                        name={item.title}
                        onEdit={() => setEditing(item)}
                        onDelete={() => deletion.ask(item)}
                    >
                        <Typography variant="body2">
                            {item.startTime} · {item.place}
                        </Typography>
                    </ItemCard>
                ))
            )}

            {editing !== null && (
                <ScheduleDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    item={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                />
            )}

            <ConfirmDeleteDialog title="Изтриване на част от програмата" deletion={deletion}>
                Сигурни ли сте, че искате да изтриете „{deletion.target?.title}“?
            </ConfirmDeleteDialog>
        </Panel>
    );
}
