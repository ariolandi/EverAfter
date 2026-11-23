import type { Dispatch, SetStateAction } from 'react';
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import {
    COLOR_USAGES,
    DRESS_CODES,
    type ColorUsage,
    type DressCode,
    type InvitationDetails,
    type ScheduleItem,
} from '../../../shared/types';
import MutedText from '../../components/MutedText';
import { COLOR_USAGE_LABELS, DRESS_CODE_LABELS } from '../../form/infoLabels';

interface ScheduleInfoProps {
    details: InvitationDetails;
    setDetails: Dispatch<SetStateAction<InvitationDetails>>;
    /** The event's schedule as it will appear on the invitation. */
    schedule: ScheduleItem[];
}

/** The invitation's schedule page: pick the dress code and how strictly the colours apply. */
export default function ScheduleInfo({ details, setDetails, schedule }: ScheduleInfoProps) {
    return (
        <Stack spacing={3}>
            <FormControl>
                <FormLabel id="dress-code-label">Дрескод</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="dress-code-label"
                    value={details.dressCode}
                    onChange={(e) => setDetails((current) => ({ ...current, dressCode: e.target.value as DressCode }))}
                >
                    {DRESS_CODES.map((code) => (
                        <FormControlLabel
                            key={code}
                            value={code}
                            control={<Radio />}
                            label={DRESS_CODE_LABELS[code]}
                        />
                    ))}
                </RadioGroup>
            </FormControl>

            <FormControl>
                <FormLabel id="color-usage-label">Цветовете на сватбата са</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="color-usage-label"
                    value={details.colorUsage}
                    onChange={(e) =>
                        setDetails((current) => ({ ...current, colorUsage: e.target.value as ColorUsage }))
                    }
                >
                    {COLOR_USAGES.map((usage) => (
                        <FormControlLabel
                            key={usage}
                            value={usage}
                            control={<Radio />}
                            label={COLOR_USAGE_LABELS[usage]}
                        />
                    ))}
                </RadioGroup>
            </FormControl>

            <Stack spacing={0.5}>
                <Typography variant="subtitle2">Програма</Typography>
                {schedule.length === 0 ? (
                    <MutedText>Все още няма добавена програма.</MutedText>
                ) : (
                    schedule.map((item) => (
                        <Typography key={item.id} variant="body2">
                            {item.startTime} · {item.title} · {item.place}
                        </Typography>
                    ))
                )}
                <MutedText>Програмата се редактира от страницата на събитието.</MutedText>
            </Stack>
        </Stack>
    );
}
