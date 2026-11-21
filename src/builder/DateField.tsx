import { useRef, useState } from 'react';
import { IconButton, InputAdornment, TextField, type SxProps, type Theme } from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import { isoToDisplayDate, isPastDate, todayIso } from '../dates';

interface DateFieldProps {
    label: string;
    /** The date as YYYY-MM-DD, or '' when none (or an incomplete/invalid one) is entered. */
    value: string;
    onChange: (iso: string) => void;
    required?: boolean;
    /** Reject dates before today: they show an error and are reported as ''. */
    disablePast?: boolean;
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
}

/** Turns typed digits into dd/mm/yyyy, adding the slashes as the user goes. */
function maskDigits(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** dd/mm/yyyy → YYYY-MM-DD, or '' unless it is a complete, real calendar date. */
function displayToIso(text: string): string {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    const [, day, month, year] = match.map(Number);
    const date = new Date(year, month - 1, day);
    const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return real ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

/**
 * A date input that always shows dd/mm/yyyy, whatever the browser's locale
 * (a native date input follows the locale), with a button opening the native calendar.
 */
export default function DateField({ label, value, onChange, required, disablePast, size, sx }: DateFieldProps) {
    const [text, setText] = useState(() => isoToDisplayDate(value));
    const [lastValue, setLastValue] = useState(value);
    const pickerRef = useRef<HTMLInputElement>(null);

    // A value set from outside (loading a saved invitation, the calendar) replaces what is typed.
    if (value !== lastValue) {
        setLastValue(value);
        if (displayToIso(text) !== value) setText(isoToDisplayDate(value));
    }

    const typedIso = displayToIso(text);
    const past = Boolean(disablePast) && isPastDate(typedIso);

    function report(iso: string) {
        onChange(disablePast && isPastDate(iso) ? '' : iso);
    }

    function handleType(input: string) {
        const masked = maskDigits(input);
        setText(masked);
        report(displayToIso(masked));
    }

    function handlePick(iso: string) {
        setText(isoToDisplayDate(iso));
        report(iso);
    }

    function openCalendar() {
        try {
            pickerRef.current?.showPicker();
        } catch {
            pickerRef.current?.focus();
        }
    }

    const invalid = text.length === 10 && typedIso === '';
    const errorText = invalid ? 'Невалидна дата' : past ? 'Датата трябва да е в бъдещето' : undefined;

    return (
        <TextField
            required={required}
            label={label}
            value={text}
            onChange={(e) => handleType(e.target.value)}
            placeholder="дд/мм/гггг"
            error={Boolean(errorText)}
            helperText={errorText}
            size={size}
            sx={sx}
            slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { inputMode: 'numeric' },
                input: {
                    endAdornment: (
                        <InputAdornment position="end" sx={{ position: 'relative' }}>
                            <IconButton edge="end" size="small" aria-label="Избери от календара" onClick={openCalendar}>
                                <CalendarMonth fontSize="small" />
                            </IconButton>
                            {/* Invisible native input that only provides the calendar popup, anchored at the button. */}
                            <input
                                ref={pickerRef}
                                type="date"
                                tabIndex={-1}
                                aria-hidden
                                value={value}
                                min={disablePast ? todayIso() : undefined}
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
