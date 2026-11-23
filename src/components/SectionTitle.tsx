import { Typography } from "@mui/material";

/** A small heading that sets off a section of the page. */
export function SectionTitle({ children }: { children: string }) {
    return (
        <Typography variant="metallic" component="h3" align="center" sx={{ fontSize: '2rem' }}>
            {children}
        </Typography>
    );
}