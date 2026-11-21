import type { ReactNode } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import MutedText from './MutedText';

interface PanelProps {
    title: ReactNode;
    /** Shown at the right of the title, e.g. a button that adds an item. */
    action?: ReactNode;
    /** A short explanation under the title. */
    description?: ReactNode;
    children?: ReactNode;
}

/** An outlined section of a page, with a title and its content stacked below. */
export default function Panel({ title, action, description, children }: PanelProps) {
    const heading = <Typography variant="h5">{title}</Typography>;
    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
                {action ? (
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        {heading}
                        {action}
                    </Stack>
                ) : (
                    heading
                )}
                {description && <MutedText>{description}</MutedText>}
                {children}
            </Stack>
        </Paper>
    );
}
