import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Add, DeleteOutlined } from '@mui/icons-material';
import type { EventInfo } from '../../shared/types';
import { api } from '../api';

interface EventListProps {
    onOpen: (eventId: number) => void;
}

/** Main page: every event of the signed-in user, with create, open and delete. */
export default function EventList({ onOpen }: EventListProps) {
    const [events, setEvents] = useState<EventInfo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creatingOpen, setCreatingOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState<EventInfo | null>(null);

    useEffect(() => {
        api.listEvents()
            .then(setEvents)
            .catch((e: Error) => setError(e.message));
    }, []);

    const create = async (event: FormEvent) => {
        event.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const created = await api.createEvent(newName.trim());
            onOpen(created.id);
        } catch (e) {
            setError((e as Error).message);
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setSaving(true);
        setError(null);
        try {
            await api.deleteEvent(toDelete.id);
            setEvents((current) => current?.filter((e) => e.id !== toDelete.id) ?? null);
            setToDelete(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack spacing={3}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">Моите събития</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setCreatingOpen(true)}>
                    Ново събитие
                </Button>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            {events?.length === 0 && <Typography color="text.secondary">Все още нямате събития.</Typography>}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
                {events?.map((event) => (
                    <Card key={event.id} variant="outlined" sx={{ position: 'relative' }}>
                        <CardActionArea onClick={() => onOpen(event.id)} sx={{ height: '100%' }}>
                            <CardContent sx={{ pr: 6 }}>
                                <Typography variant="h5" gutterBottom>
                                    {event.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Гости: {event.guestCount}
                                </Typography>
                                <Chip
                                    size="small"
                                    color={event.invitation ? 'primary' : 'default'}
                                    label={event.invitation ? 'Има покана' : 'Няма покана'}
                                />
                            </CardContent>
                        </CardActionArea>
                        <IconButton
                            aria-label={`Изтрий ${event.name}`}
                            onClick={() => setToDelete(event)}
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                        >
                            <DeleteOutlined />
                        </IconButton>
                    </Card>
                ))}
            </Box>

            <Dialog
                open={creatingOpen}
                onClose={() => setCreatingOpen(false)}
                slotProps={{ paper: { component: 'form', onSubmit: create } }}
            >
                <DialogTitle>Ново събитие</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        required
                        label="Име на събитието"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        fullWidth
                        margin="dense"
                        disabled={saving}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreatingOpen(false)}>Отказ</Button>
                    <Button type="submit" variant="contained" disabled={saving || !newName.trim()}>
                        Създай
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
                <DialogTitle>Изтриване на събитие</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Сигурни ли сте, че искате да изтриете „{toDelete?.name}“? Списъкът с гости, поканата и
                        отговорите към нея ще бъдат изтрити.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToDelete(null)}>Отказ</Button>
                    <Button color="error" variant="contained" onClick={confirmDelete} disabled={saving}>
                        Изтрий
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
