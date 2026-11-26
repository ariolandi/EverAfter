import { useEffect, useRef, type ReactNode } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import type { InvitationDetails, FormFields, FormResponseInput, Menu, ScheduleItem } from '../../shared/types';
import { isoToLongDate } from '../dates';
import { scriptFont } from '../theme/typography';
import { joinGuestNames } from './guestNames';
import RsvpForm from './RsvpForm';
import MenusPage from './MenusPage';
import ScaledFrame from './ScaledFrame';
import ScheduleDressCode from './ScheduleDressCode';
import { GoldRule } from '../components/goldRule';
import { Subtitle } from '../components/subtitle';

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
    /** The event's schedule, shown on the second page; omit (or leave empty) to show only the dress code. */
    schedule?: ScheduleItem[];
    /** The event's menus, shown on a page of their own; omit (or leave empty) to skip that page. */
    menus?: Menu[];
    /** Pages after the menus where guests make their choices (menu, accommodation, transport), one per element. */
    guestPages?: ReactNode[];
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

/** Opacity of the plaque's white fill, from 0 (clear) to 1 (solid); lower lets the background show through. */
const PLAQUE_OPACITY = 0.95;

/** Radius of the plaque's inward-arched corners, and the width of its gold edge. */
const CORNER_RADIUS = 28;
const EDGE = 4;

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

/**
 * Brushed-gold sheen running corner to corner along the border.
 * `METAL_CORNERS` are the colours it takes at each corner, so the arcs there match the straight sides.
 */
const METAL_STOPS = ['#f5e6a8 0%', '#b8902f 22%', '#fbf0c4 40%', '#9a7220 58%', '#e6cf85 78%', '#a97f26 100%'];
const METAL_BORDER = `linear-gradient(to bottom right, ${METAL_STOPS.join(', ')})`;
const METAL_CORNERS = { topLeft: '#f5e6a8', topRight: '#d9bd6a', bottomLeft: '#d9bd6a', bottomRight: '#a97f26' };

/** Metal arcs hugging the cut-out corners, so the border runs unbroken round them. */
const goldCornerRings = (radius: number) => {
    const ring = (at: string, position: string, color: string) =>
        `radial-gradient(circle at ${at}, transparent ${radius}px, ${color} ${radius}px, ${color} ${radius + EDGE}px, transparent ${radius + EDGE}px) ${position} / 51% 51% no-repeat border-box`;
    return [
        ring('0 0', 'top left', METAL_CORNERS.topLeft),
        ring('100% 0', 'top right', METAL_CORNERS.topRight),
        ring('0 100%', 'bottom left', METAL_CORNERS.bottomLeft),
        ring('100% 100%', 'bottom right', METAL_CORNERS.bottomRight),
    ].join(', ');
};

/** Tall gold-edged plaque with corners arched inwards. */
const plaqueSx = {
    position: 'relative',
    // Taller than its content, but not the whole page; long text scrolls inside.
    flex: '0 1 auto',
    minHeight: '93%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    px: 3,
    py: 5,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    // Straight sides are the border; the arched corners get their gold from background rings, since a border can't follow an arc.
    border: `solid ${EDGE}px`,
    borderImage: `${METAL_BORDER} 1`,
    boxShadow: 'inset 0 0 6px rgba(90, 60, 10, 0.25)',
    background: `${goldCornerRings(CORNER_RADIUS)}, rgba(255, 255, 255, ${PLAQUE_OPACITY})`,
    mask: concaveCornersMask(CORNER_RADIUS),
    // Content sits above the fill.
    '& > *': { position: 'relative' },
    // The answer forms are cards of their own; inside the plaque they blend in.
    '& .MuiPaper-root': { p: 0, bgcolor: 'transparent', boxShadow: 'none', border: 0 },
} as const;

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
                pt: 11,
                pb: 8,
                bgcolor: 'background.default',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {onPrev && (
                // Set below the top edge so the builder's phone notch doesn't cover it.
                <IconButton aria-label="Към предишната страница" onClick={onPrev} sx={{ ...arrowSx, top: 32 }}>
                    <KeyboardArrowUp sx={{ fontSize: '2.5rem' }} />
                </IconButton>
            )}
            {/* Every page shows its content on the same plaque. */}
            <Box sx={plaqueSx}>{children}</Box>
            {onNext && (
                <IconButton aria-label="Към следващата страница" onClick={onNext} sx={{ ...arrowSx, bottom: 8 }}>
                    <KeyboardArrowDown sx={{ fontSize: '2.5rem' }} />
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
    schedule = [],
    menus = [],
    guestPages = [],
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

    const tinted = (content: ReactNode) => (
        <Box
            sx={{
                color: textColor,
                '& .MuiTypography-root': { color: 'inherit' },
                '& .MuiTypography-root.guest-name': { color: nameColor },
                '& .MuiFormLabel-root:not(.Mui-focused)': { color: textColor },
            }}
        >
            {content}
        </Box>
    );

    // The pages in reading order; the optional ones appear only when they have something to show.
    const pages: ReactNode[] = [
        <Stack spacing={0.5} sx={{ alignItems: 'center', color: textColor }}>
                    <Subtitle italic>
                            Скъпи
                    </Subtitle>
                    <Typography variant="h6" component="p" align="center" sx={{ color: nameColor, fontStyle: 'italic', fontFamily: scriptFont, fontWeight: 400, fontSize: '1.75rem', lineHeight: 1.2 }}>
                        {addressee}
                    </Typography>
                    <GoldRule />
                    <Subtitle>{invite}</Subtitle>
                    <Typography variant="metallic" component="h2" align="center" sx={{ fontSize: '4.5rem' }}>
                        Сватба
                    </Typography>
                    <Subtitle>на <i>{weddingDate}</i></Subtitle>
                    <Subtitle italic>{place}</Subtitle>
                    <GoldRule />
                    <Subtitle>Нека заедно отбележим този щастлив момент!</Subtitle>
                    {/* The couple's names in gold, smaller than the heading. */}
                    <Typography variant="metallic" component="h5" align="center" sx={{ fontSize: '1.75rem' }}>
                        {coupleTitle}
                    </Typography>
                </Stack>,
        // The schedule page keeps the cover's colours too.
        <ScheduleDressCode details={details} schedule={schedule} textColor={textColor} accentColor={nameColor} />,
        // The answer page keeps the cover's colours: text in the primary, guests' names in the secondary.
        tinted(responseForm ?? <RsvpForm fields={fields} onSubmit={onSubmit} />),
        ...(menus.length > 0 ? [<MenusPage menus={menus} textColor={textColor} accentColor={nameColor} />] : []),
        ...guestPages.map(tinted),
    ];

    const scroller = (
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
            {pages.map((content, index) => (
                <InvitationPage
                    key={index}
                    imageUrl={imageUrl}
                    onPrev={index > 0 ? () => goToPage(index - 1) : undefined}
                    onNext={index < pages.length - 1 ? () => goToPage(index + 1) : undefined}
                >
                    {content}
                </InvitationPage>
            ))}
        </Box>
    );

    // Everything is laid out at one design size and scaled to the screen, so it looks the same on every device.
    return <ScaledFrame>{scroller}</ScaledFrame>;
}
