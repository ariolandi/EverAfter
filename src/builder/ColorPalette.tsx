import { useId } from 'react';
import { Box, IconButton, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import { MAX_COLORS, type InvitationColors } from '../../shared/types';
import { addColor, markColor, removeColor, setColor, type ColorRole } from './colorRoles';

const CIRCLE_SIZE = 36;
const MARK_SIZE = 22;

/** How a newly added colour starts out. */
const NEW_COLOR = '#ffffff';

interface ColorPaletteProps {
    palette: InvitationColors;
    onChange: (palette: InvitationColors) => void;
}

/** A small colour disc; `selected` rings it in gold. */
function Swatch({ color, selected }: { color: string; selected?: boolean }) {
    return (
        <Box
            sx={{
                width: MARK_SIZE,
                height: MARK_SIZE,
                borderRadius: '50%',
                bgcolor: color,
                border: 1,
                borderColor: 'divider',
                outline: selected ? 2 : 0,
                outlineColor: 'primary.main',
                outlineOffset: 2,
            }}
        />
    );
}

interface RolePickerProps {
    label: string;
    role: ColorRole;
    palette: InvitationColors;
    onChange: (palette: InvitationColors) => void;
}

/** Picks which one colour carries a role, as a row of radio buttons drawn as the colours. */
function RolePicker({ label, role, palette, onChange }: RolePickerProps) {
    const labelId = useId();
    return (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography id={labelId} variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>
                {label}
            </Typography>
            <RadioGroup
                row
                aria-labelledby={labelId}
                value={palette[role]}
                onChange={(e) => onChange(markColor(palette, Number(e.target.value), role))}
            >
                {palette.colors.map((color, index) => (
                    <Radio
                        key={index}
                        value={index}
                        size="small"
                        icon={<Swatch color={color} />}
                        checkedIcon={<Swatch color={color} selected />}
                        slotProps={{ input: { 'aria-label': `Цвят ${index + 1}` } }}
                        sx={{ p: 0.5 }}
                    />
                ))}
            </RadioGroup>
        </Stack>
    );
}

/** The invitation's colours: edit, add and remove them, and mark one as primary and one as secondary. */
export default function ColorPalette({ palette, onChange }: ColorPaletteProps) {
    const { colors } = palette;

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                {colors.map((color, index) => (
                    <Box
                        key={index}
                        sx={{
                            position: 'relative',
                            '&:hover .remove-color, &:focus-within .remove-color': { opacity: 1 },
                            '@media (hover: none)': { '& .remove-color': { opacity: 1 } },
                        }}
                    >
                        <Box
                            component="label"
                            aria-label={`Цвят ${index + 1}`}
                            sx={{
                                position: 'relative',
                                display: 'block',
                                width: CIRCLE_SIZE,
                                height: CIRCLE_SIZE,
                                borderRadius: '50%',
                                bgcolor: color,
                                border: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                component="input"
                                type="color"
                                value={color}
                                onChange={(e) => onChange(setColor(palette, index, e.target.value))}
                                sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            />
                        </Box>
                        {colors.length > 1 && (
                            <IconButton
                                className="remove-color"
                                aria-label={`Премахни цвят ${index + 1}`}
                                onClick={() => onChange(removeColor(palette, index))}
                                sx={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    p: 0.25,
                                    opacity: 0,
                                    transition: 'opacity 0.15s',
                                    bgcolor: 'background.paper',
                                    boxShadow: 1,
                                    '&:hover': { bgcolor: 'background.paper' },
                                }}
                            >
                                <Close sx={{ fontSize: 12 }} />
                            </IconButton>
                        )}
                    </Box>
                ))}
                {colors.length < MAX_COLORS && (
                    <IconButton
                        aria-label="Добави цвят"
                        onClick={() => onChange(addColor(palette, NEW_COLOR))}
                        sx={{
                            width: CIRCLE_SIZE,
                            height: CIRCLE_SIZE,
                            border: 1,
                            borderStyle: 'dashed',
                            borderColor: 'divider',
                        }}
                    >
                        <Add fontSize="small" />
                    </IconButton>
                )}
            </Stack>
            <RolePicker label="Основен цвят (текст)" role="primaryColor" palette={palette} onChange={onChange} />
            <RolePicker label="Вторичен цвят" role="secondaryColor" palette={palette} onChange={onChange} />
        </Stack>
    );
}
