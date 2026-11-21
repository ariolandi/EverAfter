import type { ReactNode } from 'react';
import { IconButton, Paper, Stack, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import DeleteIconButton from './DeleteIconButton';

interface ItemCardProps {
    /** The item's name: the card's heading and accessible name. */
    name: string;
    /** Shown between the name and the buttons, e.g. a status chip. */
    badge?: ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    children: ReactNode;
}

/** One item of a panel's list, as a card with its name, edit and delete buttons, and details below. */
export default function ItemCard({ name, badge, onEdit, onDelete, children }: ItemCardProps) {
    return (
        <Paper variant="outlined" component="section" aria-label={name} sx={{ p: 2 }}>
            <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {name}
                    </Typography>
                    {badge}
                    <IconButton aria-label={`Редактирай ${name}`} onClick={onEdit}>
                        <Edit />
                    </IconButton>
                    <DeleteIconButton aria-label={`Изтрий ${name}`} onClick={onDelete} />
                </Stack>
                {children}
            </Stack>
        </Paper>
    );
}
