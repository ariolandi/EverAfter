import { Add } from '@mui/icons-material';
import { Box, Button, Divider, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { PublishedForm } from '../../shared/types';

interface SidebarProps {
    events: PublishedForm[];
    onNewEvent: () => void;
}

export default function Sidebar({ events, onNewEvent }: SidebarProps) {
    return (
        <Box
            component="nav"
            sx={{
                width: 260,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                border: 2,
                borderColor: 'primary.main',
            }}
        >
            <Box sx={{ p: 2 }}>
                <Button variant="contained" startIcon={<Add />} fullWidth onClick={onNewEvent}>
                    Ново събитие
                </Button>
            </Box>
            <Divider />
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.5 }}>
                Моите събития
            </Typography>
            <List dense sx={{ overflowY: 'auto', flexGrow: 1 }}>
                {events.map((event) => (
                    <ListItemButton key={event.slug} component="a" href={`/f/${event.slug}`} target="_blank">
                        <ListItemText
                            primary={`${event.brideName} & ${event.groomName}`}
                            secondary={`${event.weddingDate} · ${event.place}`}
                        />
                    </ListItemButton>
                ))}
                {events.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                        Все още нямате събития.
                    </Typography>
                )}
            </List>
        </Box>
    );
}
