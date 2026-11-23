import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

/** The screen the invitation is designed for, in CSS pixels; every other screen sees it scaled. */
const DESIGN_WIDTH = 360;
const DESIGN_HEIGHT = 780;

/**
 * Lays its content out at the design size and scales it to fill the available space, so text and spacing keep
 * the same proportions on every screen. The limiting side of the screen matches the design exactly; any room
 * left on the other side goes to the content rather than to bigger text.
 */
export default function ScaledFrame({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number; scale: number } | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            const { clientWidth: width, clientHeight: height } = el;
            // Nothing to scale to (e.g. not laid out yet): keep the content at its natural size.
            if (width === 0 || height === 0) return;
            const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
            setSize({ width: width / scale, height: height / scale, scale });
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Box ref={ref} sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: size ? size.width : '100%',
                    height: size ? size.height : '100%',
                    transform: size ? `scale(${size.scale})` : undefined,
                    transformOrigin: 'top left',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
