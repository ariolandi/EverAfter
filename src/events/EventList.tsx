import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import { MAX_NAME_LENGTH, type EventInfo } from '../../shared/types';
import { api } from '../api';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import DeleteIconButton from '../components/DeleteIconButton';
import FormDialog from '../components/FormDialog';
import MutedText from '../components/MutedText';
import { errorMessage } from '../errors';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirmDelete } from '../hooks/useConfirmDelete';

interface EventListProps {
    onOpen: (eventId: number) => void;
}

/** Main page: every event the signed-in user owns or co-owns, with create, open and delete (owner only). */
export default function EventList({ onOpen }: EventListProps) {
    const [events, setEvents] = useState<EventInfo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creatingOpen, setCreatingOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const creating = useAsyncAction();
    const deletion = useConfirmDelete(async (event: EventInfo) => {
        await api.deleteEvent(event.id);
        setEvents((current) => current?.filter((e) => e.id !== event.id) ?? null);
    });

    useEffect(() => {
        api.listEvents()
            .then(setEvents)
            .catch((e) => setError(errorMessage(e)));
    }, []);

    const create = () =>
        void creating.run(async () => {
            const created = await api.createEvent(newName.trim());
            onOpen(created.id);
        });

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
                                <MutedText gutterBottom>Гости: {event.guestCount}</MutedText>
                                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                    <Chip
                                        size="small"
                                        color={event.invitation ? 'primary' : 'default'}
                                        label={event.invitation ? 'Има покана' : 'Няма покана'}
                                    />
                                    {!event.isOwner && (
                                        <Chip size="small" variant="outlined" label={`Съорганизатор с ${event.ownerName}`} />
                                    )}
                                </Stack>
                            </CardContent>
                        </CardActionArea>
                        {event.isOwner && (
                            <DeleteIconButton
                                aria-label={`Изтрий ${event.name}`}
                                onClick={() => deletion.ask(event)}
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                            />
                        )}
                    </Card>
                ))}
            </Box>

            <FormDialog
                title="Ново събитие"
                open={creatingOpen}
                onCancel={() => setCreatingOpen(false)}
                onSubmit={create}
                canSubmit={Boolean(newName.trim())}
                saving={creating.pending}
                error={creating.error}
                submitLabel="Създай"
            >
                <TextField
                    autoFocus
                    required
                    label="Име на събитието"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                    fullWidth
                    margin="dense"
                    disabled={creating.pending}
                />
            </FormDialog>

            <ConfirmDeleteDialog title="Изтриване на събитие" deletion={deletion}>
                Сигурни ли сте, че искате да изтриете „{deletion.target?.name}“? Списъкът с гости, поканата и
                отговорите към нея ще бъдат изтрити.
            </ConfirmDeleteDialog>
        </Stack>
    );
}
