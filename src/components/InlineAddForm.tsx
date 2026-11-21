import type { FormEvent, ReactNode } from 'react';
import { Button, Stack, TextField } from '@mui/material';

interface InlineAddFormProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** Called with the trimmed value when the form is submitted with something typed. */
    onSubmit: (value: string) => void;
    /** Disables the form while the value is being added. */
    busy: boolean;
    maxLength: number;
    type?: string;
    buttonLabel: string;
    buttonIcon: ReactNode;
    /** Extra inputs between the text field and the button. */
    children?: ReactNode;
}

/** A one-line form that adds an item to a list: a text field and a button. */
export default function InlineAddForm({
    label,
    value,
    onChange,
    onSubmit,
    busy,
    maxLength,
    type,
    buttonLabel,
    buttonIcon,
    children,
}: InlineAddFormProps) {
    const trimmed = value.trim();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (trimmed && !busy) onSubmit(trimmed);
    };

    return (
        <Stack component="form" direction="row" spacing={1} onSubmit={submit}>
            <TextField
                type={type}
                label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                slotProps={{ htmlInput: { maxLength } }}
                size="small"
                fullWidth
                disabled={busy}
            />
            {children}
            <Button
                type="submit"
                variant="contained"
                startIcon={buttonIcon}
                disabled={busy || !trimmed}
                sx={{ flexShrink: 0 }}
            >
                {buttonLabel}
            </Button>
        </Stack>
    );
}
