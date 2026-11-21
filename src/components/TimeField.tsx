import { useRef, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import AccessTime from '@mui/icons-material/AccessTime';
import { SCHEDULE_TIME_PATTERN } from '../../shared/types';

interface TimeFieldProps {
    label: string;
    /** The time as 24-hour HH:MM, or '' when none (or an incomplete/invalid one) is entered. */
    value: string;
    onChange: (time: string) => void;
    required?: boolean;
    disabled?: boolean;
}

/** Turns typed digits into HH:MM, adding the colon as the user goes. */
function maskDigits(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 4);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * A time input that always shows 24-hour HH:MM, whatever the browser's locale
 * (a native time input may show AM/PM), with a button opening the native time picker.
 */
export default function TimeField({ label, value, onChange, required, disabled }: TimeFieldProps) {
    const [text, setText] = useState(value);
    const [lastValue, setLastValue] = useState(value);
    const pickerRef = useRef<HTMLInputElement>(null);

    // A value set from outside replaces what is typed.
    if (value !== lastValue) {
        setLastValue(value);
        if (!SCHEDULE_TIME_PATTERN.test(text) || text !== value) setText(value);
    }

    function handleType(input: string) {
        const masked = maskDigits(input);
        setText(masked);
        onChange(SCHEDULE_TIME_PATTERN.test(masked) ? masked : '');
    }

    function handlePick(time: string) {
        setText(time);
        onChange(SCHEDULE_TIME_PATTERN.test(time) ? time : '');
    }

    function openPicker() {
        try {
            pickerRef.current?.showPicker();
        } catch {
            pickerRef.current?.focus();
        }
    }

    const invalid = text.length === 5 && !SCHEDULE_TIME_PATTERN.test(text);

    return (
        <TextField
            required={required}
            disabled={disabled}
            label={label}
            value={text}
            onChange={(e) => handleType(e.target.value)}
            placeholder="ЧЧ:ММ"
            error={invalid}
            helperText={invalid ? 'Невалиден час' : '24-часов формат, напр. 14:30'}
            fullWidth
            margin="dense"
            slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { inputMode: 'numeric' },
                input: {
                    endAdornment: (
                        <InputAdornment position="end" sx={{ position: 'relative' }}>
                            <IconButton
                                edge="end"
                                size="small"
                                aria-label="Избери час"
                                disabled={disabled}
                                onClick={openPicker}
                            >
                                <AccessTime fontSize="small" />
                            </IconButton>
                            {/* Invisible native input that only provides the picker popup, anchored at the button. */}
                            <input
                                ref={pickerRef}
                                type="time"
                                step={60}
                                tabIndex={-1}
                                aria-hidden
                                value={value}
                                onChange={(e) => handlePick(e.target.value)}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    bottom: 0,
                                    width: 1,
                                    height: 1,
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    border: 0,
                                    padding: 0,
                                }}
                            />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}
