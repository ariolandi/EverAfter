import { useState } from 'react';
import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import { MAX_DISH_LENGTH, MAX_NAME_LENGTH, type Menu, type MenuCourses, type MenuInput } from '../../shared/types';
import FormDialog from '../components/FormDialog';
import { useAsyncAction } from '../hooks/useAsyncAction';
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
    const saving = useAsyncAction();

    const complete = Boolean(name.trim()) && MENU_COURSES.every(({ key }) => courses[key].trim());

    const save = () =>
        void saving.run(() =>
            onSave({
                name: name.trim(),
                isChild,
                salad: courses.salad.trim(),
                appetizer: courses.appetizer.trim(),
                mainCourse: courses.mainCourse.trim(),
            }),
        );

    return (
        <FormDialog
            title={menu ? 'Редактиране на меню' : 'Ново меню'}
            onCancel={onCancel}
            onSubmit={save}
            canSubmit={complete}
            saving={saving.pending}
            error={saving.error}
        >
            <TextField
                autoFocus
                required
                label="Име на менюто"
                placeholder="напр. Вегетарианско меню"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                fullWidth
                margin="dense"
                disabled={saving.pending}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={isChild}
                        onChange={(e) => setIsChild(e.target.checked)}
                        disabled={saving.pending}
                    />
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
                    slotProps={{ htmlInput: { maxLength: MAX_DISH_LENGTH } }}
                    fullWidth
                    margin="dense"
                    disabled={saving.pending}
                />
            ))}
        </FormDialog>
    );
}
