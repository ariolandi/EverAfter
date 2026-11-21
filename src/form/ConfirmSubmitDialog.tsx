import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface ConfirmSubmitDialogProps {
    open: boolean;
    submitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    /** A summary of the answer about to be sent. */
    children: ReactNode;
    /** Extra warning, e.g. that the answer can't be changed later. */
    note?: string;
}

/** Asks the guest to check their answer before it is sent. */
export default function ConfirmSubmitDialog({
    open,
    submitting,
    onCancel,
    onConfirm,
    children,
    note,
}: ConfirmSubmitDialogProps) {
    return (
        <Dialog open={open} onClose={submitting ? undefined : onCancel} fullWidth maxWidth="xs">
            <DialogTitle>Изпращане на отговора</DialogTitle>
            <DialogContent>
                <DialogContentText gutterBottom>Моля, проверете отговора си, преди да го изпратите.</DialogContentText>
                {children}
                {note && (
                    <DialogContentText variant="body2" sx={{ mt: 2 }}>
                        {note}
                    </DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={submitting}>
                    Назад
                </Button>
                <Button variant="contained" onClick={onConfirm} disabled={submitting}>
                    {submitting ? 'Изпращане…' : 'Потвърди и изпрати'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
