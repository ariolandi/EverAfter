import { IconButton, InputAdornment, TextField } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

/** Read-only share link with a copy-to-clipboard button. */
export default function ShareLinkField({ url }: { url: string }) {
    return (
        <TextField
            label="Share link"
            value={url}
            size="small"
            fullWidth
            slotProps={{
                htmlInput: { readOnly: true },
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="Copy link"
                                edge="end"
                                onClick={() => void navigator.clipboard.writeText(url)}
                            >
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}
