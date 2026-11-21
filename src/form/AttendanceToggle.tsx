import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { answerLabel } from './answers';

interface AttendanceToggleProps {
    value: boolean | null;
    /** Called with the picked answer, or null when the picked one is clicked again. */
    onChange: (answer: boolean | null) => void;
    disabled?: boolean;
    'aria-label'?: string;
    /** How each answer reads on its button. */
    label?: (answer: boolean) => string;
}

/** The two buttons a guest answers whether they will come with. */
export default function AttendanceToggle({
    value,
    onChange,
    disabled,
    'aria-label': ariaLabel,
    label = answerLabel,
}: AttendanceToggleProps) {
    return (
        <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            aria-label={ariaLabel}
            value={value}
            onChange={(_e, next: boolean | null) => onChange(next)}
            disabled={disabled}
        >
            <ToggleButton value={true}>{label(true)}</ToggleButton>
            <ToggleButton value={false}>{label(false)}</ToggleButton>
        </ToggleButtonGroup>
    );
}
