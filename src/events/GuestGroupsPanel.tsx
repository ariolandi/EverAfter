import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Edit from '@mui/icons-material/Edit';
import HighlightOff from '@mui/icons-material/HighlightOff';
import type { Guest, GuestGroup, GuestGroupInput } from '../../shared/types';
import { api } from '../api';
import { answerLabel } from '../form/answers';
import ShareLinkField from '../form/ShareLinkField';
import { groupShareUrlFor } from '../form/shareUrl';
import GroupDialog from './GroupDialog';

interface GuestGroupsPanelProps {
    eventId: number;
    guests: Guest[];
    groups: GuestGroup[];
    onGroupsChange: (groups: GuestGroup[]) => void;
    /** Group links only open once the event has an invitation. */
    hasInvitation: boolean;
}

/** Guests grouped for invitations, each group with its own link and, once sent, its answer. */
export default function GuestGroupsPanel({ eventId, guests, groups, onGroupsChange, hasInvitation }: GuestGroupsPanelProps) {
    // The group being edited in the dialog: 'new' to create one, null when the dialog is closed.
    const [editing, setEditing] = useState<GuestGroup | 'new' | null>(null);
    const [toDelete, setToDelete] = useState<GuestGroup | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sortByName = (list: GuestGroup[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'bg'));

    /** Saving moves the chosen guests out of any other group, so those groups are updated here too. */
    const save = async (input: GuestGroupInput) => {
        const saved =
            editing === 'new' || editing === null
                ? await api.createGroup(eventId, input)
                : await api.updateGroup(eventId, editing.id, input);
        const others = groups
            .filter((g) => g.id !== saved.id)
            .map((g) => ({ ...g, guestIds: g.guestIds.filter((id) => !saved.guestIds.includes(id)) }));
        onGroupsChange(sortByName([...others, saved]));
        setEditing(null);
    };

    const remove = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteGroup(eventId, toDelete.id);
            onGroupsChange(groups.filter((g) => g.id !== toDelete.id));
            setToDelete(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    const guestName = (id: number) => guests.find((g) => g.id === id)?.name;

    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5">Групи ({groups.length})</Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setEditing('new')}
                        disabled={guests.length === 0}
                    >
                        Нова група
                    </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    Всяка група получава собствена връзка към поканата с попълнени имена. След като гостите отговорят,
                    същата връзка показва отговора им.
                </Typography>
                {!hasInvitation && groups.length > 0 && (
                    <Alert severity="info">Връзките ще заработят, след като създадете покана за събитието.</Alert>
                )}
                {error && <Alert severity="error">{error}</Alert>}
                {groups.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {guests.length === 0 ? 'Добавете гости, за да създадете група.' : 'Все още няма групи.'}
                    </Typography>
                ) : (
                    groups.map((group) => {
                        const answers = new Map(group.response?.guests.map((g) => [g.guestId, g.answer]));
                        return (
                            <Paper
                                key={group.id}
                                variant="outlined"
                                component="section"
                                aria-label={group.name}
                                sx={{ p: 2 }}
                            >
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                            {group.name}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            color={group.response ? 'success' : 'default'}
                                            label={group.response ? 'Отговорили' : 'Очаква отговор'}
                                        />
                                        <IconButton aria-label={`Редактирай ${group.name}`} onClick={() => setEditing(group)}>
                                            <Edit />
                                        </IconButton>
                                        <IconButton aria-label={`Изтрий ${group.name}`} onClick={() => setToDelete(group)}>
                                            <DeleteOutlined />
                                        </IconButton>
                                    </Stack>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {group.guestIds.map((id) => {
                                            const name = guestName(id);
                                            if (!name) return null;
                                            const answer = answers.get(id);
                                            return (
                                                <Chip
                                                    key={id}
                                                    size="small"
                                                    variant="outlined"
                                                    icon={
                                                        answer === true ? (
                                                            <CheckCircleOutlined color="success" />
                                                        ) : answer === false ? (
                                                            <HighlightOff color="error" />
                                                        ) : undefined
                                                    }
                                                    label={name}
                                                    title={typeof answer === 'boolean' ? answerLabel(answer) : undefined}
                                                />
                                            );
                                        })}
                                    </Box>
                                    <ShareLinkField url={groupShareUrlFor(group.token)} label="Връзка за групата" />
                                </Stack>
                            </Paper>
                        );
                    })
                )}
            </Stack>

            {editing !== null && (
                <GroupDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    group={editing === 'new' ? null : editing}
                    guests={guests}
                    groups={groups}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                />
            )}

            <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
                <DialogTitle>Изтриване на група</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Сигурни ли сте, че искате да изтриете „{toDelete?.name}“? Връзката на групата ще спре да
                        работи и отговорът ѝ ще бъде изтрит. Гостите остават в списъка.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToDelete(null)}>Отказ</Button>
                    <Button color="error" variant="contained" onClick={remove} disabled={deleting}>
                        Изтрий
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
