import { useState } from 'react';
import { Alert, Box, Button, Chip } from '@mui/material';
import Add from '@mui/icons-material/Add';
import type { Guest, GuestGroup, GuestGroupInput } from '../../shared/types';
import { api } from '../api';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import ItemCard from '../components/ItemCard';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import ShareLinkField from '../components/ShareLinkField';
import AnswerIcon from '../form/AnswerIcon';
import { answerLabel } from '../form/answers';
import { groupShareUrlFor } from '../form/shareUrl';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { sortByName } from '../sortByName';
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
    const deletion = useConfirmDelete(async (group: GuestGroup) => {
        await api.deleteGroup(eventId, group.id);
        onGroupsChange(groups.filter((g) => g.id !== group.id));
    });

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

    const guestName = (id: number) => guests.find((g) => g.id === id)?.name;

    return (
        <Panel
            title={`Групи (${groups.length})`}
            action={
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setEditing('new')}
                    disabled={guests.length === 0}
                >
                    Нова група
                </Button>
            }
            description="Всяка група получава собствена връзка към поканата с попълнени имена. След като гостите отговорят, същата връзка показва отговора им."
        >
            {!hasInvitation && groups.length > 0 && (
                <Alert severity="info">Връзките ще заработят, след като създадете покана за събитието.</Alert>
            )}
            {groups.length === 0 ? (
                <MutedText>
                    {guests.length === 0 ? 'Добавете гости, за да създадете група.' : 'Все още няма групи.'}
                </MutedText>
            ) : (
                groups.map((group) => {
                    const answers = new Map(group.response?.guests.map((g) => [g.guestId, g.answer]));
                    return (
                        <ItemCard
                            key={group.id}
                            name={group.name}
                            badge={
                                <Chip
                                    size="small"
                                    color={group.response ? 'success' : 'default'}
                                    label={group.response ? 'Отговорили' : 'Очаква отговор'}
                                />
                            }
                            onEdit={() => setEditing(group)}
                            onDelete={() => deletion.ask(group)}
                        >
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {group.guestIds.map((id) => {
                                    const name = guestName(id);
                                    if (!name) return null;
                                    const answer = answers.get(id);
                                    const answered = typeof answer === 'boolean';
                                    return (
                                        <Chip
                                            key={id}
                                            size="small"
                                            variant="outlined"
                                            icon={answered ? <AnswerIcon answer={answer} /> : undefined}
                                            label={name}
                                            title={answered ? answerLabel(answer) : undefined}
                                        />
                                    );
                                })}
                            </Box>
                            <ShareLinkField url={groupShareUrlFor(group.token)} label="Връзка за групата" />
                        </ItemCard>
                    );
                })
            )}

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

            <ConfirmDeleteDialog title="Изтриване на група" deletion={deletion}>
                Сигурни ли сте, че искате да изтриете „{deletion.target?.name}“? Връзката на групата ще спре да работи и
                отговорът ѝ ще бъде изтрит. Гостите остават в списъка.
            </ConfirmDeleteDialog>
        </Panel>
    );
}
