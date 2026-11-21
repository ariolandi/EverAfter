import { Alert, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import type { Guest, GuestGroup } from '../../../shared/types';
import { groupGuestNames } from '../../form/guestNames';

interface GuestsPreviewProps {
    groups: GuestGroup[];
    guests: Guest[];
    /** The group whose invitation the preview shows. */
    selectedId: number | null;
    onSelect: (groupId: number) => void;
}

/** The builder's guests step: picks which guest group's personal invitation the preview shows. */
export default function GuestsPreview({ groups, guests, selectedId, onSelect }: GuestsPreviewProps) {
    if (groups.length === 0) {
        return (
            <Alert severity="info">
                Все още няма групи гости. Добавете ги от страницата на събитието, за да видите техните покани.
            </Alert>
        );
    }

    return (
        <Stack spacing={1}>
            <Typography color="text.secondary">Изберете група, за да видите нейната покана.</Typography>
            <List aria-label="Групи гости" disablePadding>
                {groups.map((group) => (
                    <ListItemButton
                        key={group.id}
                        selected={group.id === selectedId}
                        onClick={() => onSelect(group.id)}
                        sx={{ borderRadius: 1 }}
                    >
                        <ListItemText primary={groupGuestNames(group, guests)} secondary={group.name} />
                    </ListItemButton>
                ))}
            </List>
        </Stack>
    );
}
