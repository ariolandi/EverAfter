import { useState, type ReactNode } from 'react';
import { Collapse, IconButton, Paper, Stack, Typography } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MutedText from './MutedText';

interface PanelProps {
    title: ReactNode;
    /** Shown at the right of the title, e.g. a button that adds an item. */
    action?: ReactNode;
    /** A short explanation under the title. */
    description?: ReactNode;
    /** Adds a button that folds the panel down to its title. */
    collapsible?: boolean;
    children?: ReactNode;
}

/** An outlined section of a page, with a title and its content stacked below. */
export default function Panel({ title, action, description, collapsible = false, children }: PanelProps) {
    const [open, setOpen] = useState(true);
    const heading = <Typography variant="h5">{title}</Typography>;
    const toggle = collapsible && (
        <IconButton
            size="small"
            aria-expanded={open}
            aria-label={open ? 'Свий' : 'Разгъни'}
            onClick={() => setOpen((o) => !o)}
        >
            {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
    );
    const controls = (action || toggle) && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {action}
            {toggle}
        </Stack>
    );
    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={open ? 2 : 0}>
                {controls ? (
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        {heading}
                        {controls}
                    </Stack>
                ) : (
                    heading
                )}
                <Collapse in={open}>
                    <Stack spacing={2}>
                        {description && <MutedText>{description}</MutedText>}
                        {children}
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    );
}
