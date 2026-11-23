import { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Snackbar, Stack, Step, StepButton, Stepper, Typography } from '@mui/material';
import type {
    InvitationColors,
    InvitationDetails,
    FormFields,
    Guest,
    GuestGroup,
    Menu,
    ScheduleItem,
} from '../../shared/types';
import { api } from '../api';
import BackButton from '../components/BackButton';
import { errorMessage } from '../errors';
import { loadEvent } from '../events/loadEvent';
import MenuChoice from '../form/MenuChoice';
import RsvpForm from '../form/RsvpForm';
import { guestsOf } from '../form/guestNames';
import InvitationForm from '../form/InvitationForm';
import GroupSelect from './GroupSelect';
import MainInfo from './pages/MainInfo';
import ScheduleInfo from './pages/ScheduleInfo';
import { isPastDate } from '../dates';
import { palette as appPalette } from '../theme/palette';

/** The builder's steps; each previews the invitation page at the same position. The menus step exists only when the event has menus. */
const stepsFor = (hasMenus: boolean) => [
    'Основна информация',
    'Програма и дрескод',
    ...(hasMenus ? ['Менюта'] : []),
    'Гости',
];

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
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [menus, setMenus] = useState<Menu[]>([]);
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
        dressCode: 'cocktail',
        colorUsage: 'informative',
    });
    const [loaded, setLoaded] = useState(false);
    // Slug of the event's saved invitation; null until it is first saved.
    const [slug, setSlug] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    // The invitation's background picture: uploaded in the main info step, then saved with the invitation.
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
                        dressCode: invitation.dressCode,
                        colorUsage: invitation.colorUsage,
                    });
                }
                setLoaded(true);
            })
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    useEffect(() => {
        api.listSchedule(eventId)
            .then(setSchedule)
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    useEffect(() => {
        api.listMenus(eventId)
            .then(setMenus)
            .catch((e) => setError(errorMessage(e)));
    }, [eventId]);

    const STEPS = stepsFor(menus.length > 0);
    // The guests step previews the menu-picking page, or the answer page when there are no menus; it is the last step.
    const GUESTS_STEP = STEPS.length - 1;
    const MENUS_STEP = menus.length > 0 ? 2 : -1;

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
    // A guest invited on their own is answered for like a group of one: by name, not by typing it in.
    const previewing = activeStep === GUESTS_STEP && (soloGuest || selectedGroup);

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
                            image={savedImage}
                            onImageChange={setSavedImage}
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

                {activeStep === 1 && <ScheduleInfo details={details} setDetails={setDetails} schedule={schedule} />}

                {activeStep === MENUS_STEP && (
                    <Typography color="text.secondary">
                        Менюта на събитието се показват на отделна страница в поканата. Добавяйте и променяйте менютата от
                        страницата на събитието.
                    </Typography>
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
                        schedule={schedule}
                        guestNames={selectedGuests.map((guest) => guest.name)}
                        menus={menus}
                        // The answer page follows the menu-picking page but shares its step.
                        onPageChange={(page) => setActiveStep(Math.min(page, GUESTS_STEP))}
                        menuSelection={previewing && menus.length > 0 && <MenuChoice guests={selectedGuests} menus={menus} choices={{}} />}
                        responseForm={
                            previewing && (
                                <RsvpForm fields={fields} guests={selectedGuests} response={null} />
                            )
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
