import { Box, IconButton, Stack } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import { MAX_COLORS } from '../../shared/types';

const CIRCLE_SIZE = 36;

interface ColorPaletteProps {
    colors: string[];
    onChange: (colors: string[]) => void;
}

export default function ColorPalette({ colors, onChange }: ColorPaletteProps) {
    const setColor = (index: number, color: string) => onChange(colors.map((c, i) => (i === index ? color : c)));
    const removeColor = (index: number) => onChange(colors.filter((_c, i) => i !== index));

    return (
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
                            onChange={(e) => setColor(index, e.target.value)}
                            sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        />
                    </Box>
                    {colors.length > 1 && (
                        <IconButton
                            className="remove-color"
                            aria-label={`Премахни цвят ${index + 1}`}
                            onClick={() => removeColor(index)}
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
                    onClick={() => onChange([...colors, '#ffffff'])}
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
    );
}
