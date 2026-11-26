import { useEffect, useState } from 'react';
import { Alert, List, ListItem, ListItemText } from '@mui/material';
import PersonAdd from '@mui/icons-material/PersonAdd';
import { MAX_EMAIL_LENGTH, type Coowner, type EventInfo } from '../../shared/types';
import { api } from '../api';
import DeleteIconButton from '../components/DeleteIconButton';
import InlineAddForm from '../components/InlineAddForm';
import MutedText from '../components/MutedText';
import Panel from '../components/Panel';
import { errorMessage } from '../errors';
import { useAsyncAction } from '../hooks/useAsyncAction';

interface CoownersPanelProps {
    event: EventInfo;
}

/** The people managing an event with its owner. Only the owner can invite or remove them. */
export default function CoownersPanel({ event }: CoownersPanelProps) {
    const [coowners, setCoowners] = useState<Coowner[]>([]);
    const [email, setEmail] = useState('');
    const { pending: inviting, error, setError, run } = useAsyncAction();

    useEffect(() => {
        api.listCoowners(event.id)
            .then(setCoowners)
            .catch((e) => setError(errorMessage(e)));
    }, [event.id, setError]);

    const invite = (address: string) =>
        void run(async () => {
            const coowner = await api.addCoowner(event.id, address);
            setCoowners((current) => [...current, coowner]);
            setEmail('');
        });

    const remove = (coowner: Coowner) =>
        void run(async () => {
            await api.deleteCoowner(event.id, coowner.id);
            setCoowners((current) => current.filter((c) => c.id !== coowner.id));
        });

    return (
        <Panel title="Съорганизатори" collapsible>
            {event.isOwner ? (
                <>
                    <MutedText>
                        Поканете някого да управлява събитието заедно с вас. То ще се появи в профила на човека, след
                        като влезе с Google акаунта на този имейл.
                    </MutedText>
                    <InlineAddForm
                        type="email"
                        label="Имейл"
                        value={email}
                        onChange={setEmail}
                        onSubmit={invite}
                        busy={inviting}
                        maxLength={MAX_EMAIL_LENGTH}
                        buttonLabel="Покани"
                        buttonIcon={<PersonAdd />}
                    />
                </>
            ) : (
                <MutedText>Организатор: {event.ownerName}</MutedText>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {coowners.length === 0 ? (
                <MutedText>Все още няма поканени съорганизатори.</MutedText>
            ) : (
                <List dense>
                    {coowners.map((coowner) => (
                        <ListItem
                            key={coowner.id}
                            divider
                            secondaryAction={
                                event.isOwner && (
                                    <DeleteIconButton
                                        edge="end"
                                        aria-label={`Премахни ${coowner.email}`}
                                        onClick={() => remove(coowner)}
                                    />
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
        </Panel>
    );
}
