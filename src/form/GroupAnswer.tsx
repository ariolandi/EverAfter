import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import HighlightOff from '@mui/icons-material/HighlightOff';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import { answerLabel } from './answers';

interface GroupAnswerProps {
    guests: { name: string; answer: boolean | null }[];
}

/** Each guest's answer, as sent or about to be sent. */
export default function GroupAnswer({ guests }: GroupAnswerProps) {
    return (
        <List dense disablePadding>
            {guests.map((guest, index) => (
                <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        {guest.answer === null ? (
                            <PersonOutlined fontSize="small" />
                        ) : guest.answer ? (
                            <CheckCircleOutlined fontSize="small" color="success" />
                        ) : (
                            <HighlightOff fontSize="small" color="error" />
                        )}
                    </ListItemIcon>
                    <ListItemText
                        primary={guest.name}
                        secondary={guest.answer === null ? undefined : answerLabel(guest.answer)}
                    />
                </ListItem>
            ))}
        </List>
    );
}
