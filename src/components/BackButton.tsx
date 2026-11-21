import { Box, Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';

/** Text button back to the previous screen, on a line of its own. */
export default function BackButton({ onClick, children }: { onClick: () => void; children: string }) {
    return (
        <Box>
            <Button startIcon={<ArrowBack />} onClick={onClick}>
                {children}
            </Button>
        </Box>
    );
}
