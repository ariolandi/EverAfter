import { useState, type FormEvent } from 'react';
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    TextField,
} from '@mui/material';
import type { Menu, MenuCourses, MenuInput } from '../../shared/types';
import { MENU_COURSES } from './menuCourses';

interface MenuDialogProps {
    /** The menu being edited, or null to create a new one. */
    menu: Menu | null;
    onCancel: () => void;
    onSave: (input: MenuInput) => Promise<void>;
}

/** Creates or edits a menu: its name, whether it is for children, and a dish for each course. */
export default function MenuDialog({ menu, onCancel, onSave }: MenuDialogProps) {
    const [name, setName] = useState(menu?.name ?? '');
    const [isChild, setIsChild] = useState(menu?.isChild ?? false);
    const [courses, setCourses] = useState<MenuCourses>({
        salad: menu?.salad ?? '',
        appetizer: menu?.appetizer ?? '',
        mainCourse: menu?.mainCourse ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const complete = Boolean(name.trim()) && MENU_COURSES.every(({ key }) => courses[key].trim());

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!complete) return;
        setSaving(true);
        setError(null);
        try {
            await onSave({
                name: name.trim(),
                isChild,
                salad: courses.salad.trim(),
                appetizer: courses.appetizer.trim(),
                mainCourse: courses.mainCourse.trim(),
            });
        } catch (e) {
            setError((e as Error).message);
            setSaving(false);
        }
    };

    return (
        <Dialog
            open
            onClose={onCancel}
            fullWidth
            maxWidth="sm"
            slotProps={{ paper: { component: 'form', onSubmit: save } }}
        >
            <DialogTitle>{menu ? 'Редактиране на меню' : 'Ново меню'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    required
                    label="Име на менюто"
                    placeholder="напр. Вегетарианско меню"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    fullWidth
                    margin="dense"
                    disabled={saving}
                />
                <FormControlLabel
                    control={
                        <Checkbox checked={isChild} onChange={(e) => setIsChild(e.target.checked)} disabled={saving} />
                    }
                    label="Детско меню"
                />
                {MENU_COURSES.map(({ key, label }) => (
                    <TextField
                        key={key}
                        required
                        label={label}
                        value={courses[key]}
                        onChange={(e) => setCourses((current) => ({ ...current, [key]: e.target.value }))}
                        slotProps={{ htmlInput: { maxLength: 200 } }}
                        fullWidth
                        margin="dense"
                        disabled={saving}
                    />
                ))}
                {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Отказ</Button>
                <Button type="submit" variant="contained" disabled={saving || !complete}>
                    Запази
                </Button>
            </DialogActions>
        </Dialog>
    );
}
