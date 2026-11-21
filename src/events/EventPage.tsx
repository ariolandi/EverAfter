import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ChildCare from '@mui/icons-material/ChildCare';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Edit from '@mui/icons-material/Edit';
import OpenInNew from '@mui/icons-material/OpenInNew';
import type { EventInfo, Guest, GuestGroup } from '../../shared/types';
import { api } from '../api';
import ShareLinkField from '../form/ShareLinkField';
import CoownersPanel from './CoownersPanel';
import GuestGroupsPanel from './GuestGroupsPanel';
import MenusPanel from './MenusPanel';
import { shareUrlFor } from '../form/shareUrl';

interface EventPageProps {
    eventId: number;
    onBack: () => void;
    /** Opens the builder, which creates the invitation or edits the existing one. */
    onEditInvitation: () => void;
}

/** One event: its guest list, guest groups, menus and invitation. */
export default function EventPage({ eventId, onBack, onEditInvitation }: EventPageProps) {
    const [event, setEvent] = useState<EventInfo | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [groups, setGroups] = useState<GuestGroup[]>([]);
    const [guestName, setGuestName] = useState('');
    const [guestIsChild, setGuestIsChild] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        Promise.all([api.getEvent(eventId), api.listGuests(eventId), api.listGroups(eventId)])
            .then(([loadedEvent, loadedGuests, loadedGroups]) => {
                setEvent(loadedEvent);
                setGuests(loadedGuests);
                setGroups(loadedGroups);
            })
            .catch((e: Error) => setError(e.message));
    }, [eventId]);

    const addGuest = async (e: FormEvent) => {
        e.preventDefault();
        if (!guestName.trim() || adding) return;
        setAdding(true);
        setError(null);
        try {
            const guest = await api.addGuest(eventId, { name: guestName.trim(), isChild: guestIsChild });
            setGuests((current) => [...current, guest].sort((a, b) => a.name.localeCompare(b.name, 'bg')));
            setGuestName('');
            setGuestIsChild(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setAdding(false);
        }
    };

    const toggleChild = async (guest: Guest) => {
        setError(null);
        try {
            const updated = await api.setGuestIsChild(eventId, guest.id, !guest.isChild);
            setGuests((current) => current.map((g) => (g.id === updated.id ? updated : g)));
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const removeGuest = async (guest: Guest) => {
        setError(null);
        try {
            await api.deleteGuest(eventId, guest.id);
            setGuests((current) => current.filter((g) => g.id !== guest.id));
            setGroups((current) =>
                current.map((g) => ({ ...g, guestIds: g.guestIds.filter((id) => id !== guest.id) })),
            );
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const deleteInvitation = async () => {
        if (!event?.invitation) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteForm(event.invitation.slug);
            setEvent({ ...event, invitation: null });
            setConfirmingDelete(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    const invitation = event?.invitation;
    const groupNameOf = (guest: Guest) => groups.find((g) => g.guestIds.includes(guest.id))?.name;
    const childCount = guests.filter((g) => g.isChild).length;

    return (
        <Stack spacing={3}>
            <Box>
                <Button startIcon={<ArrowBack />} onClick={onBack}>
                    Всички събития
                </Button>
            </Box>
            {event && <Typography variant="h4">{event.name}</Typography>}
            {error && <Alert severity="error">{error}</Alert>}

            {event && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h5">Списък с гости ({guests.length})</Typography>
                            {childCount > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Възрастни: {guests.length - childCount} · Деца: {childCount}
                                </Typography>
                            )}
                            <Stack component="form" direction="row" spacing={1} onSubmit={addGuest}>
                                <TextField
                                    label="Име на гост"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    slotProps={{ htmlInput: { maxLength: 100 } }}
                                    size="small"
                                    fullWidth
                                    disabled={adding}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={guestIsChild}
                                            onChange={(e) => setGuestIsChild(e.target.checked)}
                                            disabled={adding}
                                        />
                                    }
                                    label="Дете"
                                    sx={{ flexShrink: 0, mr: 0 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<Add />}
                                    disabled={adding || !guestName.trim()}
                                    sx={{ flexShrink: 0 }}
                                >
                                    Добави
                                </Button>
                            </Stack>
                            {guests.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Все още няма добавени гости.
                                </Typography>
                            ) : (
                                <List dense>
                                    {guests.map((guest) => (
                                        <ListItem
                                            key={guest.id}
                                            divider
                                            secondaryAction={
                                                <>
                                                    <IconButton
                                                        aria-label={`${guest.name} е дете`}
                                                        aria-pressed={guest.isChild}
                                                        title={guest.isChild ? 'Отбележи като възрастен' : 'Отбележи като дете'}
                                                        color={guest.isChild ? 'secondary' : 'default'}
                                                        onClick={() => void toggleChild(guest)}
                                                    >
                                                        <ChildCare />
                                                    </IconButton>
                                                    <IconButton
                                                        edge="end"
                                                        aria-label={`Премахни ${guest.name}`}
                                                        onClick={() => void removeGuest(guest)}
                                                    >
                                                        <DeleteOutlined />
                                                    </IconButton>
                                                </>
                                            }
                                            sx={{ pr: 12 }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <>
                                                        {guest.name}
                                                        {guest.isChild && <Chip size="small" label="Дете" sx={{ ml: 1 }} />}
                                                    </>
                                                }
                                                secondary={groupNameOf(guest)}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <Typography variant="h5">Покана</Typography>
                            {invitation ? (
                                <>
                                    <Typography>
                                        {invitation.brideName} & {invitation.groomName}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {invitation.weddingDate} · {invitation.place}
                                    </Typography>
                                    <ShareLinkField url={shareUrlFor(invitation.slug)} />
                                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                        <Button variant="contained" startIcon={<Edit />} onClick={onEditInvitation}>
                                            Редактирай
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<OpenInNew />}
                                            href={`/f/${invitation.slug}`}
                                            target="_blank"
                                        >
                                            Отвори поканата
                                        </Button>
                                        <Button
                                            color="error"
                                            startIcon={<DeleteOutlined />}
                                            onClick={() => setConfirmingDelete(true)}
                                        >
                                            Изтрий
                                        </Button>
                                    </Stack>
                                </>
                            ) : (
                                <>
                                    <Typography color="text.secondary">Това събитие все още няма покана.</Typography>
                                    <Box>
                                        <Button variant="contained" startIcon={<Add />} onClick={onEditInvitation}>
                                            Създай покана
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    </Paper>

                    <GuestGroupsPanel
                        eventId={eventId}
                        guests={guests}
                        groups={groups}
                        onGroupsChange={setGroups}
                        hasInvitation={Boolean(invitation)}
                    />

                    <MenusPanel eventId={eventId} childCount={childCount} />

                    <CoownersPanel event={event} />
                </Box>
            )}

            <Dialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)}>
                <DialogTitle>Изтриване на покана</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Сигурни ли сте, че искате да изтриете поканата? Връзката към нея ще спре да работи, а
                        получените отговори ще бъдат изтрити.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmingDelete(false)}>Отказ</Button>
                    <Button color="error" variant="contained" onClick={deleteInvitation} disabled={deleting}>
                        Изтрий
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
