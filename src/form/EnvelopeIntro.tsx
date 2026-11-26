import { useId, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { darken, keyframes, lighten, useTheme } from '@mui/material/styles';

interface Props {
    /** Colour of the envelope; a hex value or a theme colour such as `primary.dark`. */
    color: string;
    /** The invitation that is taken out of the envelope. */
    children: ReactNode;
}

// The envelope fills the whole screen.
const ENVELOPE = { left: 0, right: 0, top: 0, height: '100%' } as const;
// Where the point of the flap and of the pocket's three folds meet, as a percentage of the height.
const APEX = 55;

// Timeline, in seconds: the flap opens, the invitation rises, the envelope drops away.
const FLAP_DELAY = 0.5;
const FLAP_TIME = 0.9;
const CARD_DELAY = 1.3;
const CARD_TIME = 1.6;
const EXIT_DELAY = 2.2;
const EXIT_TIME = 0.9;

const openFlap = keyframes`
    from { transform: perspective(1100px) rotateX(0deg); }
    to { transform: perspective(1100px) rotateX(180deg); }
`;
// The flap lies over the pocket while closed and falls behind the invitation once it is open.
const flapLayer = keyframes`
    from { z-index: 4; }
    49% { z-index: 4; }
    50% { z-index: 1; }
    to { z-index: 1; }
`;
// The invitation starts smaller, lower and slightly tilted inside the envelope, its edges hidden by the folds,
// and it casts a shadow while it is lifted out.
const riseOut = keyframes`
    from { transform: translateY(25%) scale(0.85) rotate(-1.5deg); filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.45)); z-index: 2; }
    50% { z-index: 2; }
    51% { z-index: 5; }
    to { transform: none; filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0)); z-index: 5; }
`;
const dropAway = keyframes`
    from { transform: translateY(0); }
    to { transform: translateY(120%); }
`;

const exit = `${dropAway} ${EXIT_TIME}s ${EXIT_DELAY}s ease-in both`;

/** Turns a theme colour like `primary.dark` into its value; plain colours pass through. */
function useResolvedColor(color: string) {
    const palette = useTheme().palette as unknown as Record<string, unknown>;
    if (!color.includes('.')) return color;
    const [group, tone] = color.split('.');
    const entry = palette[group];
    const value = entry && typeof entry === 'object' ? (entry as Record<string, unknown>)[tone] : undefined;
    return typeof value === 'string' ? value : color;
}

/** Darkens for a negative amount and lightens for a positive one, whatever the colour format. */
const shaded = (color: string, amount: number) => {
    try {
        return amount < 0 ? darken(color, -amount) : lighten(color, amount);
    } catch {
        return color;
    }
};

/** The scalloped outline of the seal: a circle whose edge ripples a little, like pressed metal. */
const SEAL_EDGE = (() => {
    const points = Array.from({ length: 96 }, (_, i) => {
        const angle = (i / 96) * Math.PI * 2;
        const radius = 45 + 2.4 * Math.sin(angle * 12) + 0.8 * Math.sin(angle * 5 + 1);
        return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
    });
    return `M${points.join('L')}Z`;
})();

/** Golden seal holding the flap shut. */
function Seal({ id }: { id: string }) {
    return (
        <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
                position: 'absolute',
                left: '50%',
                top: `${APEX}%`,
                width: 112,
                height: 112,
                transform: 'translate(-50%, -50%) translateZ(1px)',
                backfaceVisibility: 'hidden',
                filter: 'drop-shadow(0 4px 5px rgba(0, 0, 0, 0.5))',
            }}
        >
            <defs>
                <radialGradient id={`${id}-gold`} cx="35%" cy="30%" r="85%">
                    <stop offset="0" stopColor="#fbf0c4" />
                    <stop offset="0.45" stopColor="#d9bd6a" />
                    <stop offset="1" stopColor="#8a6418" />
                </radialGradient>
                <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8a6418" />
                    <stop offset="1" stopColor="#fbf0c4" />
                </linearGradient>
                <radialGradient id={`${id}-dish`} cx="60%" cy="65%" r="80%">
                    <stop offset="0" stopColor="#fbf0c4" />
                    <stop offset="0.5" stopColor="#d2b25a" />
                    <stop offset="1" stopColor="#a47a1f" />
                </radialGradient>
            </defs>
            <path d={SEAL_EDGE} fill={`url(#${id}-gold)`} />
            <circle cx="50" cy="50" r="33" fill={`url(#${id}-dish)`} stroke={`url(#${id}-ring)`} strokeWidth="3" />
            <circle cx="50" cy="50" r="27" fill="none" stroke="#8a6418" strokeOpacity="0.55" strokeWidth="0.8" />
            {/* A heart pressed into the middle. */}
            <path
                d="M50 66 C 30 52, 34 36, 44 38 C 48 39, 50 42, 50 45 C 50 42, 52 39, 56 38 C 66 36, 70 52, 50 66 Z"
                fill={`url(#${id}-ring)`}
                stroke="#fbf0c4"
                strokeOpacity="0.6"
                strokeWidth="0.8"
            />
        </Box>
    );
}

/** Fills a piece with a drawing laid out on a 100 × 100 grid that stretches to the screen. */
const Drawing = ({ children }: { children: ReactNode }) => (
    <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
        {children}
    </Box>
);

const FOLD_LINE = { strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' } as const;

/** Plays a short opening of an envelope, the invitation sliding out of it, when the invitation first appears. */
export default function EnvelopeIntro({ color: requested, children }: Props) {
    const [done, setDone] = useState(false);
    const id = useId().replace(/:/g, '');
    const paper = useResolvedColor(requested);
    const light = shaded(paper, 0.28);
    const dark = shaded(paper, -0.28);
    const darker = shaded(paper, -0.5);
    const crease = shaded(paper, -0.42);
    const highlight = shaded(paper, 0.45);

    const piece = { position: 'absolute', ...ENVELOPE, pointerEvents: 'none' } as const;
    const apex = `50,${APEX}`;
    const flapShape = `0,0 100,0 ${apex}`;

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* Same element before and after the animation, so the invitation keeps its state when it ends. */}
            <Box
                sx={{
                    position: 'relative',
                    height: '100%',
                    animation: done ? 'none' : `${riseOut} ${CARD_TIME}s ${CARD_DELAY}s ease-in-out both`,
                }}
            >
                {children}
            </Box>
            {!done && (
                <>
                    {/* The inside of the envelope, seen once the flap is up. */}
                    <Box
                        sx={{ ...piece, zIndex: 1, animation: exit }}
                        onAnimationEnd={(e) => e.target === e.currentTarget && setDone(true)}
                    >
                        <Drawing>
                            <defs>
                                <linearGradient id={`${id}-lining`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor={darker} />
                                    <stop offset="1" stopColor={dark} />
                                </linearGradient>
                                <pattern id={`${id}-diamonds`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                    <path d="M0 0H8M0 0V8" stroke={dark} strokeWidth="0.5" fill="none" />
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill={`url(#${id}-lining)`} />
                            <rect width="100" height="100" fill={`url(#${id}-diamonds)`} />
                        </Drawing>
                    </Box>
                    {/* The pocket: two side folds and the bottom one, lit from above. */}
                    <Box sx={{ ...piece, zIndex: 3, animation: exit, filter: 'drop-shadow(0 -3px 7px rgba(0, 0, 0, 0.4))' }}>
                        <Drawing>
                            <defs>
                                <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0" stopColor={dark} />
                                    <stop offset="1" stopColor={paper} />
                                </linearGradient>
                                <linearGradient id={`${id}-right`} x1="1" y1="0" x2="0" y2="0">
                                    <stop offset="0" stopColor={dark} />
                                    <stop offset="1" stopColor={paper} />
                                </linearGradient>
                                <linearGradient id={`${id}-bottom`} x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0" stopColor={light} />
                                    <stop offset="1" stopColor={paper} />
                                </linearGradient>
                            </defs>
                            <polygon points={`0,0 ${apex} 0,100`} fill={`url(#${id}-left)`} stroke={crease} {...FOLD_LINE} />
                            <polygon points={`100,0 ${apex} 100,100`} fill={`url(#${id}-right)`} stroke={crease} {...FOLD_LINE} />
                            <polygon points={`0,100 ${apex} 100,100`} fill={`url(#${id}-bottom)`} stroke={crease} {...FOLD_LINE} />
                            {/* A lit edge along the bottom fold. */}
                            <polyline points={`0,100 ${apex} 100,100`} fill="none" stroke={highlight} {...FOLD_LINE} strokeWidth={0.8} transform="translate(0 0.4)" />
                        </Drawing>
                    </Box>
                    {/* The flap: the outside faces us at first, the lining shows once it is turned over. */}
                    <Box
                        sx={{
                            ...piece,
                            zIndex: 4,
                            animation: `${flapLayer} ${FLAP_TIME}s ${FLAP_DELAY}s step-end both, ${exit}`,
                            filter: 'drop-shadow(0 5px 8px rgba(0, 0, 0, 0.4))',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                transformStyle: 'preserve-3d',
                                transformOrigin: 'top',
                                animation: `${openFlap} ${FLAP_TIME}s ${FLAP_DELAY}s ease-in-out both`,
                            }}
                        >
                            <Box sx={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                                <Drawing>
                                    <defs>
                                        <linearGradient id={`${id}-flap`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0" stopColor={light} />
                                            <stop offset="1" stopColor={paper} />
                                        </linearGradient>
                                    </defs>
                                    <polygon points={flapShape} fill={`url(#${id}-flap)`} stroke={crease} {...FOLD_LINE} />
                                </Drawing>
                            </Box>
                            <Box sx={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                <Drawing>
                                    <polygon points={flapShape} fill={`url(#${id}-lining)`} stroke={crease} {...FOLD_LINE} />
                                    <polygon points={flapShape} fill={`url(#${id}-diamonds)`} />
                                </Drawing>
                            </Box>
                            <Seal id={id} />
                        </Box>
                    </Box>
                </>
            )}
        </Box>
    );
}
