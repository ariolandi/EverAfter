import { useEffect, useState } from 'react';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import type { Menu, MenuInput } from '../../shared/types';
import { api } from '../api';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import ItemCard from '../components/ItemCard';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import { errorMessage } from '../errors';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { byName } from '../sortByName';
import MenuDialog from './MenuDialog';
import { MENU_COURSES } from './menuCourses';

interface MenusPanelProps {
    eventId: number;
    /** How many guests are marked as children, to point out a missing children's menu. */
    childCount: number;
}

/** Adults' menus first, then children's, each by name; matches the order the server lists them in. */
const sortMenus = (list: Menu[]) => [...list].sort((a, b) => Number(a.isChild) - Number(b.isChild) || byName(a, b));

/** The menu options served at the event, each with a salad, an appetizer and a main course. */
export default function MenusPanel({ eventId, childCount }: MenusPanelProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    // The menu being edited in the dialog: 'new' to create one, null when the dialog is closed.
    const [editing, setEditing] = useState<Menu | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const deletion = useConfirmDelete(async (menu: Menu) => {
        await api.deleteMenu(eventId, menu.id);
        setMenus((current) => current.filter((m) => m.id !== menu.id));
    });

    useEffect(() => {
        api.listMenus(eventId)
            .then(setMenus)
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    const save = async (input: MenuInput) => {
        const saved =
            editing === 'new' || editing === null
                ? await api.createMenu(eventId, input)
                : await api.updateMenu(eventId, editing.id, input);
        setMenus((current) => sortMenus([...current.filter((m) => m.id !== saved.id), saved]));
        setEditing(null);
    };

    const missingChildMenu = childCount > 0 && !menus.some((m) => m.isChild);

    return (
        <Panel
            collapsible
            title={`Менюта (${menus.length})`}
            action={
                <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>
                    Ново меню
                </Button>
            }
            description="Всяко меню съдържа салата, предястие и основно ястие. Добавете и детско меню за малките гости."
        >
            {missingChildMenu && (
                <Alert severity="info">
                    В списъка има {childCount === 1 ? '1 дете' : `${childCount} деца`}, но все още няма детско меню.
                </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {menus.length === 0 ? (
                <MutedText>Все още няма менюта.</MutedText>
            ) : (
                menus.map((menu) => (
                    <ItemCard
                        key={menu.id}
                        name={menu.name}
                        badge={menu.isChild && <Chip size="small" color="secondary" label="Детско" />}
                        onEdit={() => setEditing(menu)}
                        onDelete={() => deletion.ask(menu)}
                    >
                        <Stack component="dl" spacing={0.5} sx={{ m: 0 }}>
                            {MENU_COURSES.map(({ key, label }) => (
                                <Stack key={key} direction="row" spacing={1}>
                                    <MutedText component="dt" sx={{ minWidth: 120 }}>
                                        {label}
                                    </MutedText>
                                    <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                                        {menu[key]}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </ItemCard>
                ))
            )}

            {editing !== null && (
                <MenuDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    menu={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                />
            )}

            <ConfirmDeleteDialog title="Изтриване на меню" deletion={deletion}>
                Сигурни ли сте, че искате да изтриете „{deletion.target?.name}“?
            </ConfirmDeleteDialog>
        </Panel>
    );
}
