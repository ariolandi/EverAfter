import { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Snackbar, Stack, Step, StepButton, Stepper, Typography } from '@mui/material';
import type { InvitationColors, InvitationDetails, FormFields, Guest, GuestGroup } from '../../shared/types';
import { api } from '../api';
import BackButton from '../components/BackButton';
import { errorMessage } from '../errors';
import { loadEvent } from '../events/loadEvent';
import GroupRsvpForm from '../form/GroupRsvpForm';
import { guestsOf } from '../form/guestNames';
import InvitationForm from '../form/InvitationForm';
import GroupSelect from './GroupSelect';
import GuestsPreview from './pages/GuestsPreview';
import MainInfo from './pages/MainInfo';
import { isPastDate } from '../dates';
import { palette as appPalette } from '../theme/palette';

const STEPS = ['Основна информация', 'Гости'];

/** A new invitation starts in the app's own colours: ink for the text, with a gold accent. */
const DEFAULT_COLORS: InvitationColors = {
    colors: [appPalette.ink.main, appPalette.primary.main].map((color) => color.toLowerCase()),
    primaryColor: 0,
    secondaryColor: 1,
};

interface BuilderProps {
    /** The event whose invitation is created, or edited if it already has one. */
    eventId: number;
    onBack: () => void;
}

export default function Builder({ eventId, onBack }: BuilderProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [groups, setGroups] = useState<GuestGroup[]>([]);
    // The group whose personal invitation the preview shows on the guests step.
    const [previewGroupId, setPreviewGroupId] = useState<number | null>(null);
    const [previewGuestId, setPreviewGuestId] = useState<number | null>(null);
    const [fields, setFields] = useState<FormFields>({ showName: true, showAnswer: true });
    const [details, setDetails] = useState<InvitationDetails>({
        brideName: '',
        groomName: '',
        weddingDate: '',
        place: '',
        ...DEFAULT_COLORS,
        invitationText: '',
    });
    const [loaded, setLoaded] = useState(false);
    // Slug of the event's saved invitation; null until it is first saved.
    const [slug, setSlug] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    // The saved invitation's image, kept as it is on every save.
    const [savedImage, setSavedImage] = useState<{ id: number; url: string } | null>(null);
    const imageId = savedImage?.id ?? null;
    const imageUrl = savedImage?.url ?? null;

    /** Saves the invitation; resolves to whether the save succeeded. */
    const save = async (): Promise<boolean> => {
        setSaving(true);
        setError(null);
        try {
            const form = slug
                ? await api.updateForm(slug, imageId, fields, details)
                : await api.publishForm(eventId, imageId, fields, details);
            setSlug(form.slug);
            setSavedImage(form.imageId !== null && form.imageUrl ? { id: form.imageId, url: form.imageUrl } : null);
            setSavedNotice(true);
            return true;
        } catch (e) {
            setError(errorMessage(e));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveAndNext = async () => {
        if (await save()) setActiveStep((step) => step + 1);
    };

    useEffect(() => {
        loadEvent(eventId)
            .then(({ event, guests: loadedGuests, groups: loadedGroups }) => {
                setGuests(loadedGuests);
                setGroups(loadedGroups);
                setPreviewGroupId(loadedGroups[0]?.id ?? null);
                const { invitation } = event;
                if (invitation) {
                    setSlug(invitation.slug);
                    if (invitation.imageId !== null && invitation.imageUrl) {
                        setSavedImage({ id: invitation.imageId, url: invitation.imageUrl });
                    }
                    setFields({ showName: invitation.showName, showAnswer: invitation.showAnswer });
                    setDetails({
                        brideName: invitation.brideName,
                        groomName: invitation.groomName,
                        weddingDate: invitation.weddingDate,
                        place: invitation.place,
                        colors: invitation.colors,
                        primaryColor: invitation.primaryColor,
                        secondaryColor: invitation.secondaryColor,
                        invitationText: invitation.invitationText,
                    });
                }
                setLoaded(true);
            })
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    const detailsComplete = Boolean(
        details.brideName.trim() &&
            details.groomName.trim() &&
            details.weddingDate &&
            !isPastDate(details.weddingDate) &&
            details.place.trim() &&
            details.colors.length > 0,
    );
    const canSave = !saving && detailsComplete && (fields.showName || fields.showAnswer);
    const selectedGroup = groups.find((group) => group.id === previewGroupId);
    // The cover page greets the selected group on every step; its answer form shows only on the guests step.
    const soloGuest = guests.find(
        (guest) => guest.id === previewGuestId && !groups.some((group) => group.guestIds.includes(guest.id)),
    );
    const selectedGuests = soloGuest ? [soloGuest] : selectedGroup ? guestsOf(selectedGroup, guests) : [];
    const previewGroup = activeStep === 1 ? selectedGroup : undefined;
    const previewGuests = previewGroup ? selectedGuests : [];

    if (!loaded) return error ? <Alert severity="error">{error}</Alert> : null;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                gap: 6,
                height: { md: '100%' },
            }}
        >
            <Stack spacing={3} sx={{ minWidth: 0, overflowY: { md: 'auto' } }}>
                <BackButton onClick={onBack}>Към събитието</BackButton>
                <Typography variant="h4">{slug ? 'Редактирай поканата' : 'Създай своята покана'}</Typography>

                <Stepper nonLinear activeStep={activeStep}>
                    {STEPS.map((label, index) => (
                        <Step key={label}>
                            <StepButton onClick={() => setActiveStep(index)}>{label}</StepButton>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <>
                        <MainInfo
                            details={details}
                            setDetails={setDetails}
                            fields={fields}
                            setFields={setFields}
                        />
                        <GroupSelect
                            groups={groups}
                            guests={guests}
                            selectedId={previewGroupId}
                            selectedGuestId={previewGuestId}
                            onSelect={(id) => {
                                setPreviewGuestId(null);
                                setPreviewGroupId(id);
                            }}
                            onSelectGuest={(id) => {
                                setPreviewGroupId(null);
                                setPreviewGuestId(id);
                            }}
                        />
                    </>
                )}

                {activeStep === 1 && (
                    <GuestsPreview
                        groups={groups}
                        guests={guests}
                        selectedId={previewGroupId}
                        onSelect={(id) => {
                            setPreviewGuestId(null);
                            setPreviewGroupId(id);
                        }}
                    />
                )}

                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Button disabled={activeStep === 0} onClick={() => setActiveStep((step) => step - 1)}>
                        Назад
                    </Button>
                    <Button
                        variant="contained"
                        disabled={activeStep === STEPS.length - 1 || !canSave}
                        onClick={saveAndNext}
                    >
                        Напред
                    </Button>

                    <Box>
                        <Button
                            variant="outlined"
                            onClick={save}
                            disabled={!canSave}
                        >
                            {saving ? 'Запазване…' : 'Запази'}
                        </Button>
                    </Box>
                </Stack>
                {error && <Alert severity="error">{error}</Alert>}
                <Snackbar
                    open={savedNotice}
                    autoHideDuration={3000}
                    onClose={() => setSavedNotice(false)}
                    message="Поканата е запазена"
                />
            </Stack>

            <Divider
                orientation="vertical"
                sx={{ display: { xs: 'none', md: 'block' }, borderColor: 'primary.main', borderRightWidth: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 0 }}>
                <Box
                    sx={{
                        position: 'relative',
                        height: { xs: 560, md: '100%' },
                        maxHeight: 720,
                        aspectRatio: '9 / 19.5',
                        border: 10,
                        borderColor: 'grey.900',
                        borderRadius: '44px',
                        overflow: 'hidden',
                        bgcolor: 'grey.100',
                        boxShadow: 6,
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '32%',
                            height: 22,
                            borderRadius: 12,
                            bgcolor: 'grey.900',
                            zIndex: 1,
                        }}
                    />
                    <InvitationForm
                        fields={fields}
                        details={details}
                        imageUrl={imageUrl}
                        page={activeStep}
                        guestNames={selectedGuests.map((guest) => guest.name)}
                        onPageChange={setActiveStep}
                        responseForm={
                            previewGroup && (
                                <GroupRsvpForm fields={fields} guests={previewGuests} response={null} />
                            )
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
