import type { ReactNode } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import type { ConfirmDelete } from '../hooks/useConfirmDelete';

interface ConfirmDeleteDialogProps<T> {
    title: string;
    /** From `useConfirmDelete`; the dialog is open while it has a target. */
    deletion: ConfirmDelete<T>;
    /** The question, saying what will be lost. */
    children: ReactNode;
}

/** Asks before deleting something, and shows why if deleting fails. */
export default function ConfirmDeleteDialog<T>({ title, deletion, children }: ConfirmDeleteDialogProps<T>) {
    const { target, deleting, error, cancel, confirm } = deletion;
    return (
        <Dialog open={target !== null} onClose={deleting ? undefined : cancel}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{children}</DialogContentText>
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={cancel} disabled={deleting}>
                    Отказ
                </Button>
                <Button color="error" variant="contained" onClick={() => void confirm()} disabled={deleting}>
                    Изтрий
                </Button>
            </DialogActions>
        </Dialog>
    );
}
