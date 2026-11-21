import type { FormEvent, ReactNode } from 'react';
import { Paper } from '@mui/material';

const sx = { p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' } as const;

interface FormCardProps {
    children: ReactNode;
    /** Makes the card a form submitting to this. */
    onSubmit?: (event: FormEvent) => void;
}

/** The light card an answer form sits on, readable over the invitation's photo. */
export default function FormCard({ children, onSubmit }: FormCardProps) {
    return onSubmit ? (
        <Paper component="form" onSubmit={onSubmit} sx={sx}>
            {children}
        </Paper>
    ) : (
        <Paper sx={sx}>{children}</Paper>
    );
}
