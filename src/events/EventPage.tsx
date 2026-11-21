import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ChildCare from '@mui/icons-material/ChildCare';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Edit from '@mui/icons-material/Edit';
import OpenInNew from '@mui/icons-material/OpenInNew';
import { MAX_NAME_LENGTH, type EventInfo, type Guest, type GuestGroup, type PublishedForm } from '../../shared/types';
import { api } from '../api';
import BackButton from '../components/BackButton';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import DeleteIconButton from '../components/DeleteIconButton';
import InlineAddForm from '../components/InlineAddForm';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import ShareLinkField from '../components/ShareLinkField';
import { isoToDisplayDate } from '../dates';
import { errorMessage } from '../errors';
import { shareUrlFor } from '../form/shareUrl';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { sortByName } from '../sortByName';
import CoownersPanel from './CoownersPanel';
import GuestGroupsPanel from './GuestGroupsPanel';
import { loadEvent } from './loadEvent';
import MenusPanel from './MenusPanel';

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
    const { pending: busy, error, setError, run } = useAsyncAction();
    const invitationDeletion = useConfirmDelete(async (invitation: PublishedForm) => {
        await api.deleteForm(invitation.slug);
        setEvent((current) => current && { ...current, invitation: null });
    });

    useEffect(() => {
        loadEvent(eventId)
            .then((loaded) => {
                setEvent(loaded.event);
                setGuests(loaded.guests);
                setGroups(loaded.groups);
            })
            .catch((e) => setError(errorMessage(e)));
    }, [eventId, setError]);

    const addGuest = (name: string) =>
        void run(async () => {
            const guest = await api.addGuest(eventId, { name, isChild: guestIsChild });
            setGuests((current) => sortByName([...current, guest]));
            setGuestName('');
            setGuestIsChild(false);
        });

    const toggleChild = (guest: Guest) =>
        void run(async () => {
            const updated = await api.setGuestIsChild(eventId, guest.id, !guest.isChild);
            setGuests((current) => current.map((g) => (g.id === updated.id ? updated : g)));
        });

    const removeGuest = (guest: Guest) =>
        void run(async () => {
            await api.deleteGuest(eventId, guest.id);
            setGuests((current) => current.filter((g) => g.id !== guest.id));
            setGroups((current) =>
                current.map((g) => ({ ...g, guestIds: g.guestIds.filter((id) => id !== guest.id) })),
            );
        });

    const invitation = event?.invitation;
    const groupNameOf = (guest: Guest) => groups.find((g) => g.guestIds.includes(guest.id))?.name;
    const childCount = guests.filter((g) => g.isChild).length;

    return (
        <Stack spacing={3}>
            <BackButton onClick={onBack}>Всички събития</BackButton>
            {event && <Typography variant="h4">{event.name}</Typography>}
            {error && <Alert severity="error">{error}</Alert>}

            {event && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <Panel title={`Списък с гости (${guests.length})`}>
                        {childCount > 0 && (
                            <MutedText>
                                Възрастни: {guests.length - childCount} · Деца: {childCount}
                            </MutedText>
                        )}
                        <InlineAddForm
                            label="Име на гост"
                            value={guestName}
                            onChange={setGuestName}
                            onSubmit={addGuest}
                            busy={busy}
                            maxLength={MAX_NAME_LENGTH}
                            buttonLabel="Добави"
                            buttonIcon={<Add />}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={guestIsChild}
                                        onChange={(e) => setGuestIsChild(e.target.checked)}
                                        disabled={busy}
                                    />
                                }
                                label="Дете"
                                sx={{ flexShrink: 0, mr: 0 }}
                            />
                        </InlineAddForm>
                        {guests.length === 0 ? (
                            <MutedText>Все още няма добавени гости.</MutedText>
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
                                                    onClick={() => toggleChild(guest)}
                                                >
                                                    <ChildCare />
                                                </IconButton>
                                                <DeleteIconButton
                                                    edge="end"
                                                    aria-label={`Премахни ${guest.name}`}
                                                    onClick={() => removeGuest(guest)}
                                                />
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
                    </Panel>

                    <Panel title="Покана">
                        {invitation ? (
                            <>
                                <Typography>
                                    {invitation.brideName} & {invitation.groomName}
                                </Typography>
                                <Typography color="text.secondary">
                                    {isoToDisplayDate(invitation.weddingDate)} · {invitation.place}
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
                                        onClick={() => invitationDeletion.ask(invitation)}
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
                    </Panel>

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

            <ConfirmDeleteDialog title="Изтриване на покана" deletion={invitationDeletion}>
                Сигурни ли сте, че искате да изтриете поканата? Връзката към нея ще спре да работи, а получените
                отговори ще бъдат изтрити.
            </ConfirmDeleteDialog>
        </Stack>
    );
}
