import { Typography, type TypographyProps } from '@mui/material';

/** Small secondary text: hints, empty-list notes and summaries. */
export default function MutedText(props: TypographyProps) {
    return <Typography variant="body2" color="text.secondary" {...props} />;
}
