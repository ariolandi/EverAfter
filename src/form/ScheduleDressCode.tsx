import { Box, Stack, Typography } from '@mui/material';
import type { InvitationDetails, ScheduleItem } from '../../shared/types';
import { COLOR_USAGE_NOTES, DRESS_CODE_LABELS } from './infoLabels';
import { GoldRule } from '../components/goldRule';
import { Subtitle } from '../components/subtitle';
import { SectionTitle } from '../components/SectionTitle';

interface ScheduleDressCodeProps {
    details: InvitationDetails;
    schedule: ScheduleItem[];
    /** Colour of the text; the times stand out in `accentColor`. */
    textColor: string;
    accentColor: string;
}

/** The invitation's second page: the event's schedule, the dress code and the colours guests are asked to wear. */
export default function ScheduleDressCode({ details, schedule, textColor, accentColor }: ScheduleDressCodeProps) {
    return (
        <Stack spacing={2.5} sx={{ alignItems: 'center', color: textColor }}>
            {schedule.length > 0 && (
                <Stack spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
                    <SectionTitle>Програма</SectionTitle>
                    <Stack component="ol" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none', width: '100%' }}>
                        {schedule.map((item) => (
                            <Box
                                component="li"
                                key={item.id}
                                sx={{
                                    position: 'relative',
                                    pl: 3,
                                    textAlign: 'left',
                                    // A circle marker in place of the list's default bullet.
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: 4,
                                        top: '0.55em',
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        // Outline only, so the marker stays light next to the text.
                                        border: 2,
                                        borderColor: accentColor,
                                        boxSizing: 'border-box',
                                    },
                                }}
                            >
                                <Typography component="span" sx={{ color: accentColor }}>
                                    {item.startTime}
                                </Typography>
                                <Typography component="span"> · {item.title}</Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                    {item.place}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Stack>
            )}
            <GoldRule />
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <SectionTitle>Дрескод</SectionTitle>
                <Typography align="center">Препоръчително е {DRESS_CODE_LABELS[details.dressCode]} облекло</Typography>
            </Stack>

            <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <Typography align="center" variant="body2">
                    {COLOR_USAGE_NOTES[details.colorUsage]}
                </Typography>
                <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    role="list"
                    aria-label="Цветове"
                    sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
                >
                    {details.colors.map((color, index) => (
                        <Box
                            key={index}
                            role="listitem"
                            aria-label={color}
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: color,
                                border: 1,
                                borderColor: 'divider',
                            }}
                        />
                    ))}
                </Stack>
                {details.colorUsage == 'informative' && (
                    <Subtitle italic size="0.75rem">
                        Спазването им не е задължително
                    </Subtitle>
                )}
            </Stack>
        </Stack>
    );
}
