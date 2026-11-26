import { useState } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
    MAX_NAME_LENGTH,
    MAX_ROOM_WITH_LENGTH,
    menusForGuest,
    type Guest,
    type GuestResponse,
    type GuestResponseInput,
    type Menu,
} from '../../shared/types';
import FormDialog from '../components/FormDialog';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { ownAnswerLabel } from '../form/answers';
import AttendanceToggle from '../form/AttendanceToggle';
import { ACCOMMODATION_LABELS, type TransportDraft } from '../form/guestChoices';
import TransportPicker from '../form/TransportPicker';

interface ResponseDialogProps {
    /** A listed guest, or an answer from the general link, whose name the guest typed and can be corrected here. */
    guest: Pick<Guest, 'name' | 'isChild'>;
    /** Lets the name be corrected too, for answers from the general link. */
    editableName?: boolean;
    /** The guest's recorded answer, or null if they have not answered and the organizer records one. */
    response: GuestResponse | null;
    menus: Menu[];
    /** Whether the invitation asks if the guest will attend. */
    showAnswer: boolean;
    onCancel: () => void;
    onSave: (input: GuestResponseInput & { name?: string }) => Promise<void>;
}

/** Records or corrects a guest's answer on their behalf, with the same choices their invitation offers. */
export default function ResponseDialog({
    guest,
    editableName = false,
    response,
    menus,
    showAnswer,
    onCancel,
    onSave,
}: ResponseDialogProps) {
    const [name, setName] = useState(guest.name);
    const [answer, setAnswer] = useState<boolean | null>(response?.answer ?? null);
    const [menuId, setMenuId] = useState<number | null>(response?.menuId ?? null);
    const [accommodation, setAccommodation] = useState<boolean | null>(response?.accommodation ?? null);
    const [roomWith, setRoomWith] = useState(response?.roomWith ?? '');
    const [transport, setTransport] = useState<TransportDraft | null>(response?.transport ?? null);
    const saving = useAsyncAction();

    // As on the invitation, only a guest who comes has a menu, accommodation and transport to choose.
    const attends = !showAnswer || answer === true;
    const options = menusForGuest(menus, guest.isChild);
    const named = !editableName || name.trim() !== '';
    const complete = named && (showAnswer
        ? answer === false ||
          (answer === true &&
              (options.length === 0 || menuId !== null) &&
              accommodation !== null &&
              transport !== null &&
              transport !== 'none')
        : (options.length === 0 || menuId !== null) && accommodation !== null && transport !== null && transport !== 'none');

    const save = () =>
        void saving.run(() =>
            onSave(
                attends
                    ? {
                          ...(editableName && { name: name.trim() }),
                          ...(showAnswer && { answer: true }),
                          ...(options.length > 0 && menuId !== null && { menuId }),
                          accommodation: accommodation!,
                          // Sent even when empty, so a preference the organizer clears is cleared.
                          roomWith: accommodation ? roomWith.trim() : '',
                          transport: transport as Exclude<TransportDraft, 'none'>,
                      }
                    : { ...(editableName && { name: name.trim() }), answer: false },
            ),
        );

    return (
        <FormDialog
            title={`Отговор на ${guest.name}`}
            onCancel={onCancel}
            onSubmit={save}
            canSubmit={complete}
            saving={saving.pending}
            error={saving.error}
        >
            <Stack spacing={2} sx={{ pt: 1 }}>
                {editableName && (
                    <TextField
                        required
                        size="small"
                        fullWidth
                        label="Име"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                        disabled={saving.pending}
                    />
                )}
                {showAnswer && (
                    <AttendanceToggle
                        aria-label={`Отговор за ${guest.name}`}
                        value={answer}
                        onChange={setAnswer}
                        disabled={saving.pending}
                        label={ownAnswerLabel}
                    />
                )}
                {attends && (
                    <>
                        {options.length > 0 && (
                            <TextField
                                select
                                size="small"
                                fullWidth
                                label="Меню"
                                value={menuId ?? ''}
                                onChange={(e) => setMenuId(Number(e.target.value))}
                                disabled={saving.pending}
                            >
                                {options.map((menu) => (
                                    <MenuItem key={menu.id} value={menu.id}>
                                        {menu.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                        <Stack spacing={0.5}>
                            <Typography variant="subtitle2">Нощувка</Typography>
                            <AttendanceToggle
                                aria-label={`Нощувка за ${guest.name}`}
                                value={accommodation}
                                onChange={setAccommodation}
                                disabled={saving.pending}
                                label={(uses) => (uses ? ACCOMMODATION_LABELS.yes : ACCOMMODATION_LABELS.no)}
                            />
                            {accommodation === true && (
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="С кого предпочита да сподели стая?"
                                    value={roomWith}
                                    onChange={(e) => setRoomWith(e.target.value)}
                                    disabled={saving.pending}
                                    slotProps={{ htmlInput: { maxLength: MAX_ROOM_WITH_LENGTH } }}
                                />
                            )}
                        </Stack>
                        <Stack spacing={0.5}>
                            <Typography variant="subtitle2">Превоз</Typography>
                            <TransportPicker
                                guestName={guest.name}
                                value={transport}
                                onChange={setTransport}
                                disabled={saving.pending}
                            />
                        </Stack>
                    </>
                )}
            </Stack>
        </FormDialog>
    );
}
