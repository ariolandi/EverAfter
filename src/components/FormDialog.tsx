import type { FormEvent, ReactNode } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

interface FormDialogProps {
    title: string;
    /** Defaults to open, for dialogs that are mounted only while shown. */
    open?: boolean;
    onCancel: () => void;
    /** Called on submit, once the form can be submitted. */
    onSubmit: () => void;
    /** Whether the form is filled in enough to submit. */
    canSubmit: boolean;
    /** Disables the submit button while the form is being saved. */
    saving: boolean;
    error?: string | null;
    submitLabel?: string;
    children: ReactNode;
}

/** A dialog that is a form: its fields, the error of the last attempt, and cancel and submit buttons. */
export default function FormDialog({
    title,
    open = true,
    onCancel,
    onSubmit,
    canSubmit,
    saving,
    error,
    submitLabel = 'Запази',
    children,
}: FormDialogProps) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (canSubmit && !saving) onSubmit();
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            fullWidth
            maxWidth="sm"
            slotProps={{ paper: { component: 'form', onSubmit: submit } }}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {children}
                {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Отказ</Button>
                <Button type="submit" variant="contained" disabled={saving || !canSubmit}>
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
