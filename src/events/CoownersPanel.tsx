import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import PersonAdd from '@mui/icons-material/PersonAdd';
import type { Coowner, EventInfo } from '../../shared/types';
import { api } from '../api';

interface CoownersPanelProps {
    event: EventInfo;
}

/** The people managing an event with its owner. Only the owner can invite or remove them. */
export default function CoownersPanel({ event }: CoownersPanelProps) {
    const [coowners, setCoowners] = useState<Coowner[]>([]);
    const [email, setEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.listCoowners(event.id)
            .then(setCoowners)
            .catch((e: Error) => setError(e.message));
    }, [event.id]);

    const invite = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim() || inviting) return;
        setInviting(true);
        setError(null);
        try {
            const coowner = await api.addCoowner(event.id, email.trim());
            setCoowners((current) => [...current, coowner]);
            setEmail('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setInviting(false);
        }
    };

    const remove = async (coowner: Coowner) => {
        setError(null);
        try {
            await api.deleteCoowner(event.id, coowner.id);
            setCoowners((current) => current.filter((c) => c.id !== coowner.id));
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
                <Typography variant="h5">Съорганизатори</Typography>
                {event.isOwner ? (
                    <>
                        <Typography variant="body2" color="text.secondary">
                            Поканете някого да управлява събитието заедно с вас. То ще се появи в профила на човека,
                            след като влезе с Google акаунта на този имейл.
                        </Typography>
                        <Stack component="form" direction="row" spacing={1} onSubmit={invite}>
                            <TextField
                                type="email"
                                label="Имейл"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                slotProps={{ htmlInput: { maxLength: 254 } }}
                                size="small"
                                fullWidth
                                disabled={inviting}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<PersonAdd />}
                                disabled={inviting || !email.trim()}
                                sx={{ flexShrink: 0 }}
                            >
                                Покани
                            </Button>
                        </Stack>
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Организатор: {event.ownerName}
                    </Typography>
                )}
                {error && <Alert severity="error">{error}</Alert>}
                {coowners.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Все още няма поканени съорганизатори.
                    </Typography>
                ) : (
                    <List dense>
                        {coowners.map((coowner) => (
                            <ListItem
                                key={coowner.id}
                                divider
                                secondaryAction={
                                    event.isOwner && (
                                        <IconButton
                                            edge="end"
                                            aria-label={`Премахни ${coowner.email}`}
                                            onClick={() => void remove(coowner)}
                                        >
                                            <DeleteOutlined />
                                        </IconButton>
                                    )
                                }
                            >
                                <ListItemText
                                    primary={coowner.name ?? coowner.email}
                                    secondary={coowner.name ? coowner.email : 'Още не е влизал(а) в EverAfter'}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Stack>
        </Paper>
    );
}
