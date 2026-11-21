import { useEffect, useState } from 'react';
import {
    Alert,
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
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Edit from '@mui/icons-material/Edit';
import type { Menu, MenuInput } from '../../shared/types';
import { api } from '../api';
import MenuDialog from './MenuDialog';
import { MENU_COURSES } from './menuCourses';

interface MenusPanelProps {
    eventId: number;
    /** How many guests are marked as children, to point out a missing children's menu. */
    childCount: number;
}

/** Adults' menus first, then children's, each by name; matches the order the server lists them in. */
const sortMenus = (list: Menu[]) =>
    [...list].sort((a, b) => Number(a.isChild) - Number(b.isChild) || a.name.localeCompare(b.name, 'bg'));

/** The menu options served at the event, each with a salad, an appetizer and a main course. */
export default function MenusPanel({ eventId, childCount }: MenusPanelProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    // The menu being edited in the dialog: 'new' to create one, null when the dialog is closed.
    const [editing, setEditing] = useState<Menu | 'new' | null>(null);
    const [toDelete, setToDelete] = useState<Menu | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listMenus(eventId)
            .then(setMenus)
            .catch((e: Error) => setError(e.message));
    }, [eventId]);

    const save = async (input: MenuInput) => {
        const saved =
            editing === 'new' || editing === null
                ? await api.createMenu(eventId, input)
                : await api.updateMenu(eventId, editing.id, input);
        setMenus((current) => sortMenus([...current.filter((m) => m.id !== saved.id), saved]));
        setEditing(null);
    };

    const remove = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteMenu(eventId, toDelete.id);
            setMenus((current) => current.filter((m) => m.id !== toDelete.id));
            setToDelete(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setDeleting(false);
        }
    };

    const missingChildMenu = childCount > 0 && !menus.some((m) => m.isChild);

    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5">Менюта ({menus.length})</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>
                        Ново меню
                    </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    Всяко меню съдържа салата, предястие и основно ястие. Добавете и детско меню за малките гости.
                </Typography>
                {missingChildMenu && (
                    <Alert severity="info">
                        В списъка има {childCount === 1 ? '1 дете' : `${childCount} деца`}, но все още няма детско
                        меню.
                    </Alert>
                )}
                {error && <Alert severity="error">{error}</Alert>}
                {menus.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Все още няма менюта.
                    </Typography>
                ) : (
                    menus.map((menu) => (
                        <Paper key={menu.id} variant="outlined" component="section" aria-label={menu.name} sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        {menu.name}
                                    </Typography>
                                    {menu.isChild && <Chip size="small" color="secondary" label="Детско" />}
                                    <IconButton aria-label={`Редактирай ${menu.name}`} onClick={() => setEditing(menu)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton aria-label={`Изтрий ${menu.name}`} onClick={() => setToDelete(menu)}>
                                        <DeleteOutlined />
                                    </IconButton>
                                </Stack>
                                <Stack component="dl" spacing={0.5} sx={{ m: 0 }}>
                                    {MENU_COURSES.map(({ key, label }) => (
                                        <Stack key={key} direction="row" spacing={1}>
                                            <Typography
                                                component="dt"
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ minWidth: 120 }}
                                            >
                                                {label}
                                            </Typography>
                                            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                                                {menu[key]}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Stack>
                        </Paper>
                    ))
                )}
            </Stack>

            {editing !== null && (
                <MenuDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    menu={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                />
            )}

            <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
                <DialogTitle>Изтриване на меню</DialogTitle>
                <DialogContent>
                    <DialogContentText>Сигурни ли сте, че искате да изтриете „{toDelete?.name}“?</DialogContentText>
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
