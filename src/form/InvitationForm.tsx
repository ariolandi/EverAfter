import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import type { InvitationDetails, FormFields, FormResponseInput } from '../../shared/types';

interface Props {
    fields: FormFields;
    details: InvitationDetails;
    imageUrl: string | null;
    /** Omit to render a non-submittable preview. */
    onSubmit?: (response: FormResponseInput) => Promise<void>;
    /** Page to show, matching the builder's step. Omit to let the reader scroll freely. */
    page?: number;
    /** Called when the reader moves to another page by arrow or scrolling. */
    onPageChange?: (page: number) => void;
}

interface PageProps {
    children: ReactNode;
    imageUrl?: string | null;
    /** Shows the arrow that moves to the next page. */
    onNext?: () => void;
}

function InvitationPage({ children, imageUrl, onNext }: PageProps) {
    return (
        <Box
            sx={{
                position: 'relative',
                height: '100%',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: imageUrl ? 'flex-end' : 'center',
                p: 2,
                pb: onNext ? 7 : 2,
                bgcolor: 'background.default',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {children}
            {onNext && (
                <IconButton
                    aria-label="Към следващата страница"
                    onClick={onNext}
                    sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.95)' },
                    }}
                >
                    <KeyboardArrowDown />
                </IconButton>
            )}
        </Box>
    );
}

export default function InvitationForm({ fields, details, imageUrl, onSubmit, page, onPageChange }: Props) {
    const coupleTitle = [details.brideName, details.groomName].map((n) => n.trim()).filter(Boolean).join(' & ');
    const [year, month, day] = details.weddingDate.split('-').map(Number);
    // Built from parts so the date is local and doesn't shift a day in timezones west of UTC.
    const weddingDate = details.weddingDate
        ? new Date(year, month - 1, day).toLocaleDateString('BG', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const [name, setName] = useState('');
    const [answer, setAnswer] = useState<boolean | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const complete = (!fields.showName || name.trim() !== '') && (!fields.showAnswer || answer !== null);

    const scrollToPage = (target: number) => {
        const el = scrollRef.current;
        el?.scrollTo({ top: target * el.clientHeight, behavior: 'smooth' });
    };

    useEffect(() => {
        if (page !== undefined) scrollToPage(page);
    }, [page]);

    // Controlled previews let the parent move the page so it stays in sync with the builder.
    const goToPage = (target: number) => (onPageChange ? onPageChange(target) : scrollToPage(target));

    const reportScrolledPage = () => {
        const el = scrollRef.current;
        if (el && onPageChange) onPageChange(Math.round(el.scrollTop / el.clientHeight));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!onSubmit || !complete) return;
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({
                ...(fields.showName && { name: name.trim() }),
                ...(fields.showAnswer && answer !== null && { answer }),
            });
            setSubmitted(true);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            ref={scrollRef}
            onScrollEnd={reportScrolledPage}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                scrollSnapType: 'y mandatory',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            <InvitationPage onNext={() => goToPage(1)}>
                <Paper sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
                    <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="h5" align="center" color="primary.dark">
                            {coupleTitle}
                        </Typography>
                        <Typography variant="subtitle1" align="center" color="text.secondary">ви канят на</Typography>
                        <Typography variant="metallic" component="h2" align="center">
                            Сватба
                        </Typography>
                        <Typography variant="subtitle1" align="center" color="text.secondary">на</Typography>
                        <Typography variant="subtitle1" align="center" color="text.secondary">
                            {weddingDate}
                        </Typography>
                        <Typography variant="subtitle1" align="center" color="text.secondary">в</Typography>
                        <Typography variant="subtitle1" align="center" color="text.secondary">
                            {details.place}
                        </Typography>
                    </Stack>
                </Paper>
            </InvitationPage>

            <InvitationPage imageUrl={imageUrl}>
                <Paper component="form" onSubmit={submit} sx={{ p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.92)' }}>
                    {submitted ? (
                        <Alert severity="success">Благодарим ви за отговора!</Alert>
                    ) : (
                        <Stack spacing={1.5}>
                            {fields.showName && (
                                <TextField
                                    required
                                    label="Вашето име"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    slotProps={{ htmlInput: { maxLength: 100 } }}
                                    size="small"
                                    fullWidth
                                    disabled={submitting}
                                />
                            )}
                            {fields.showAnswer && (
                                <ToggleButtonGroup
                                    exclusive
                                    fullWidth
                                    size="small"
                                    color="primary"
                                    value={answer}
                                    onChange={(_e, value: boolean | null) => setAnswer(value)}
                                    disabled={submitting}
                                >
                                    <ToggleButton value={true}>Ще присъствам</ToggleButton>
                                    <ToggleButton value={false}>Няма да присъствам</ToggleButton>
                                </ToggleButtonGroup>
                            )}
                            {error && <Alert severity="error">{error}</Alert>}
                            <Button type="submit" variant="contained" disabled={!onSubmit || !complete || submitting}>
                                {submitting ? 'Изпращане…' : 'Изпрати'}
                            </Button>
                        </Stack>
                    )}
                </Paper>
            </InvitationPage>
        </Box>
    );
}
