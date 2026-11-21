import { useEffect, useRef, type ReactNode } from 'react';
import { Box, Divider, IconButton, Stack, Typography } from '@mui/material';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import type { InvitationDetails, FormFields, FormResponseInput } from '../../shared/types';
import { isoToLongDate } from '../dates';
import { scriptFont } from '../theme/typography';
import { joinGuestNames } from './guestNames';
import RsvpForm from './RsvpForm';

interface Props {
    fields: FormFields;
    details: InvitationDetails;
    imageUrl: string | null;
    /** Omit to render a non-submittable preview. */
    onSubmit?: (response: FormResponseInput) => Promise<void>;
    /** Replaces the general answer form, e.g. with a group's form that has the names filled in. */
    responseForm?: ReactNode;
    /** Page to show, matching the builder's step. Omit to let the reader scroll freely. */
    page?: number;
    /** Called when the reader moves to another page by arrow or scrolling. */
    onPageChange?: (page: number) => void;
    /** Names of the guests the invitation is addressed to; omit (or leave empty) to greet the guests in general. */
    guestNames?: string[];
}

interface PageProps {
    children: ReactNode;
    imageUrl?: string | null;
    /** Shows the arrow at the bottom that moves to the next page. */
    onNext?: () => void;
    /** Shows the arrow at the top that moves back to the previous page. */
    onPrev?: () => void;
}

/** Gold arrow on a light disc, so it stands out on top of a photo too. */
const arrowSx = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'primary.main',
    bgcolor: 'rgba(255, 255, 255, 0.85)',
    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.95)', color: 'primary.dark' },
} as const;

/** Radius of the plaque's inward-arched corners, and the width of its gold edge. */
const CORNER_RADIUS = 28;
const EDGE = 2;

/**
 * Mask that cuts a quarter circle out of each corner, centred on the corner itself.
 * `offset` moves the circles' centres outwards, so an inner layer inset by `offset` keeps an even edge.
 */
const concaveCornersMask = (radius: number, offset = 0) => {
    const corner = (x: string, y: string, position: string) =>
        `radial-gradient(circle at ${x} ${y}, transparent ${radius}px, #000 ${radius + 0.5}px) ${position} / 51% 51% no-repeat`;
    const near = `${-offset}px`;
    const far = `calc(100% + ${offset}px)`;
    return [
        corner(near, near, 'top left'),
        corner(far, near, 'top right'),
        corner(near, far, 'bottom left'),
        corner(far, far, 'bottom right'),
    ].join(', ');
};

/** Tall gold-edged plaque with corners arched inwards; a white layer inset by the edge shows the gold as a border. */
const plaqueSx = {
    position: 'relative',
    // Taller than its content, but not the whole page; long text scrolls inside.
    flex: '0 1 auto',
    minHeight: '85%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    px: 3,
    py: 5,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    bgcolor: 'primary.main',
    mask: concaveCornersMask(CORNER_RADIUS),
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: EDGE,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        mask: concaveCornersMask(CORNER_RADIUS + EDGE, EDGE),
    },
    // Content sits above the white layer.
    '& > *': { position: 'relative' },
    // The answer forms are cards of their own; inside the plaque they blend in.
    '& .MuiPaper-root': { p: 0, bgcolor: 'transparent', boxShadow: 'none', border: 0 },
} as const;

/** A line of the cover page's text, under the greeting. */
function Subtitle({ children, italic }: { children: ReactNode; italic?: boolean }) {
    return (
        <Typography variant="subtitle1" align="center" color="inherit" sx={italic ? { fontStyle: 'italic' } : undefined}>
            {children}
        </Typography>
    );
}

/** A thin gold rule that sets off a part of the cover text. */
function GoldRule() {
    return <Divider aria-hidden sx={{ width: '40%', my: 1, borderColor: 'primary.main' }} />;
}

function InvitationPage({ children, imageUrl, onNext, onPrev }: PageProps) {
    return (
        <Box
            sx={{
                position: 'relative',
                height: '100%',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                // The same padding on every page, leaving room for both arrows, so the plaque never moves.
                px: 2,
                pt: 10,
                pb: 7,
                bgcolor: 'background.default',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {onPrev && (
                // Set below the top edge so the builder's phone notch doesn't cover it.
                <IconButton aria-label="Към предишната страница" onClick={onPrev} sx={{ ...arrowSx, top: 36 }}>
                    <KeyboardArrowUp />
                </IconButton>
            )}
            {/* Every page shows its content on the same plaque. */}
            <Box sx={plaqueSx}>{children}</Box>
            {onNext && (
                <IconButton aria-label="Към следващата страница" onClick={onNext} sx={{ ...arrowSx, bottom: 8 }}>
                    <KeyboardArrowDown />
                </IconButton>
            )}
        </Box>
    );
}

export default function InvitationForm({
    fields,
    details,
    imageUrl,
    onSubmit,
    responseForm,
    page,
    onPageChange,
    guestNames = [],
}: Props) {
    const coupleTitle = [details.brideName, details.groomName]
        .map((n) => n.trim())
        .filter(Boolean)
        .join(' & ');
    const weddingDate = isoToLongDate(details.weddingDate);
    // The invitation's text is written in its primary colour; the gold headings keep their gilding.
    const textColor = details.colors[details.primaryColor] ?? 'text.secondary';
    // The guests' names stand out in the secondary colour.
    const nameColor = details.colors[details.secondaryColor] ?? 'primary.dark';
    const place = details.place.trim();
    // Guests are greeted by their first name only: "Иван Иванов" → "Иван".
    const names = guestNames.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
    const addressee = names.length > 0 ? joinGuestNames(names) : 'гости';
    // A single guest is addressed informally in the singular ("те"), a group in the plural ("ви").
    const invite = `имаме удоволствието да ${names.length === 1 ? 'те' : 'ви'} поканим на`;
    const scrollRef = useRef<HTMLDivElement>(null);

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
                <Stack spacing={0.5} sx={{ alignItems: 'center', color: textColor }}>
                    <Subtitle italic>
                            Скъпи
                    </Subtitle>
                    <Typography variant="h6" component="p" align="center" sx={{ color: nameColor, fontStyle: 'italic', fontFamily: scriptFont, fontWeight: 400, fontSize: '1.75rem', lineHeight: 1.2 }}>
                        {addressee}
                    </Typography>
                    <GoldRule />
                    <Subtitle>{invite}</Subtitle>
                    <Typography variant="metallic" component="h2" align="center">
                        Сватба
                    </Typography>
                    <Subtitle>на <i>{weddingDate}</i></Subtitle>
                    <Subtitle italic>{place}</Subtitle>
                    <GoldRule />
                    <Subtitle>Нека заедно отбележим този щастлив момент!</Subtitle>
                    {/* The couple's names in gold, smaller than the heading. */}
                    <Typography variant="metallic" component="h5" align="center" sx={{ fontWeight: 600, fontSize: '1.5rem' }}>
                        {coupleTitle}
                    </Typography>
                </Stack>
            </InvitationPage>

            <InvitationPage imageUrl={imageUrl} onPrev={() => goToPage(0)}>
                {/* The answer page keeps the cover's colours: text in the primary, guests' names in the secondary. */}
                <Box
                    sx={{
                        color: textColor,
                        '& .MuiTypography-root': { color: 'inherit' },
                        '& .MuiTypography-root.guest-name': { color: nameColor },
                        '& .MuiFormLabel-root:not(.Mui-focused)': { color: textColor },
                    }}
                >
                    {responseForm ?? <RsvpForm fields={fields} onSubmit={onSubmit} />}
                </Box>
            </InvitationPage>
        </Box>
    );
}
