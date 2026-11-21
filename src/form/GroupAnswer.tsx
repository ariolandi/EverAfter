import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import AnswerIcon from './AnswerIcon';
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
                        ) : (
                            <AnswerIcon answer={guest.answer} fontSize="small" />
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
