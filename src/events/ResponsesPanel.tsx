import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Chip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import OpenInNew from '@mui/icons-material/OpenInNew';
import type { FormResponseInput, Guest, GuestResponse, GuestResponseInput, Menu, PublishedForm, ResponseEntry } from '../../shared/types';
import { api } from '../api';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import { formatLongDate } from '../dates';
import { errorMessage } from '../errors';
import { answerLabel } from '../form/answers';
import { TRANSPORT_SHORT_LABELS } from '../form/guestChoices';
import { guestShareUrlFor } from '../form/shareUrl';
import ResponseDialog from './ResponseDialog';

interface ResponsesPanelProps {
    eventId: number;
    guests: Guest[];
    /** The invitation guests answer; there is nothing to answer until the event has one. */
    invitation: PublishedForm | null;
}

const yesNo = (value: boolean | null) => (value === null ? '—' : value ? 'Да' : 'Не');

function attendance(response: GuestResponse | null, showAnswer: boolean) {
    if (!response) return <Chip size="small" label="Очаква отговор" />;
    if (!showAnswer || response.answer === null) return <Chip size="small" color="success" label="Отговорил" />;
    return <Chip size="small" color={response.answer ? 'success' : 'error'} variant="outlined" label={answerLabel(response.answer)} />;
}

/**
 * Every guest's answer in one table, for the organizers: whether they come, their menu, accommodation and transport.
 * Answers can be previewed on the guest's own invitation and recorded or corrected here.
 */
export default function ResponsesPanel({ eventId, guests, invitation }: ResponsesPanelProps) {
    const [entries, setEntries] = useState<ResponseEntry[]>([]);
    const [menus, setMenus] = useState<Menu[]>([]);
    // The guest whose answer is being edited in the dialog, null when it is closed.
    const [editing, setEditing] = useState<Guest | null>(null);
    // The general-link answer being corrected, null when its dialog is closed.
    const [editingGeneral, setEditingGeneral] = useState<ResponseEntry | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        () =>
            Promise.all([api.listResponses(eventId), api.listMenus(eventId)])
                .then(([loadedEntries, loadedMenus]) => {
                    setEntries(loadedEntries);
                    setMenus(loadedMenus);
                })
                .catch((e) => setError(errorMessage(e))),
        [eventId],
    );

    // The table follows the guest list, so a guest added or removed above shows up here.
    useEffect(() => {
        void load();
    }, [load, guests, invitation]);

    const showAnswer = invitation?.showAnswer ?? true;
    const save = async (input: GuestResponseInput) => {
        await api.saveGuestResponse(eventId, editing!.id, input);
        setEditing(null);
        await load();
    };

    const saveGeneral = async (input: FormResponseInput) => {
        await api.saveGeneralResponse(eventId, editingGeneral!.generalResponseId!, input);
        setEditingGeneral(null);
        await load();
    };

    const answered =entries.filter((e) => e.response).length;
    const menuName = (id: number | null) => menus.find((m) => m.id === id)?.name ?? '—';

    return (
        <Panel
            title={`Отговори (${answered} от ${entries.length})`}
            description="Отговорите на гостите от личните им връзки и от общата връзка. Можете да отворите поканата на всеки гост, както и да запишете или поправите негов отговор."
        >
            {!invitation && entries.length > 0 && (
                <Alert severity="info">Гостите ще могат да отговарят, след като създадете покана за събитието.</Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {entries.length === 0 ? (
                <MutedText>Все още няма гости.</MutedText>
            ) : (
                <TableContainer>
                    <Table size="small" aria-label="Отговори на гостите">
                        <TableHead>
                            <TableRow>
                                <TableCell>Гост</TableCell>
                                <TableCell>Група</TableCell>
                                <TableCell>Присъствие</TableCell>
                                <TableCell>Меню</TableCell>
                                <TableCell>Нощувка</TableCell>
                                <TableCell>Стая с</TableCell>
                                <TableCell>Превоз</TableCell>
                                <TableCell>Отговорил на</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry, index) => {
                                const guest = guests.find((g) => g.id === entry.guestId);
                                const { response } = entry;
                                return (
                                    <TableRow key={entry.guestId ?? `general-${entry.generalResponseId ?? index}`}>
                                        <TableCell component="th" scope="row">
                                            {entry.name || '—'}
                                        </TableCell>
                                        <TableCell>{entry.groupName ?? '—'}</TableCell>
                                        <TableCell>{attendance(response, showAnswer)}</TableCell>
                                        <TableCell>{response ? menuName(response.menuId) : '—'}</TableCell>
                                        <TableCell>{yesNo(response?.accommodation ?? null)}</TableCell>
                                        <TableCell>{response?.roomWith || '—'}</TableCell>
                                        <TableCell>
                                            {response?.transport ? TRANSPORT_SHORT_LABELS[response.transport] : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {response ? formatLongDate(new Date(response.respondedAt)) : '—'}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            {guest && (
                                                <>
                                                    <IconButton
                                                        aria-label={`Отвори поканата на ${guest.name}`}
                                                        title="Отвори поканата на госта"
                                                        href={guestShareUrlFor(guest.token)}
                                                        target="_blank"
                                                        disabled={!invitation}
                                                    >
                                                        <OpenInNew fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label={`Редактирай отговора на ${guest.name}`}
                                                        title="Запиши или поправи отговора"
                                                        onClick={() => setEditing(guest)}
                                                        disabled={!invitation}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                            {entry.generalResponseId !== null && (
                                                <IconButton
                                                    aria-label={`Редактирай отговора на ${entry.name || 'гост'}`}
                                                    title="Поправи отговора"
                                                    onClick={() => setEditingGeneral(entry)}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {editing && (
                <ResponseDialog
                    key={editing.id}
                    guest={editing}
                    response={entries.find((e) => e.guestId === editing.id)?.response ?? null}
                    menus={menus}
                    showAnswer={showAnswer}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                />
            )}

            {editingGeneral && (
                <ResponseDialog
                    key={editingGeneral.generalResponseId}
                    guest={{ name: editingGeneral.name, isChild: false }}
                    editableName={invitation?.showName ?? true}
                    response={editingGeneral.response}
                    menus={menus}
                    showAnswer={showAnswer}
                    onCancel={() => setEditingGeneral(null)}
                    onSave={saveGeneral}
                />
            )}
        </Panel>
    );
}
