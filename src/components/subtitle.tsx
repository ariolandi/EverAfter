import { Typography } from "@mui/material";
import type { ReactNode } from "react";

/** A line of the cover page's text, under the greeting. */
export function Subtitle({ children, italic, size }: { children: ReactNode; italic?: boolean; size?: string }) {
    return (
        <Typography variant="subtitle1" align="center" color="inherit" sx={{...(italic && {fontStyle: 'italic'}), ...(size && {fontSize: size})}}>
            {children}
        </Typography>
    );
}
