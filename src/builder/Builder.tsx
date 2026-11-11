import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Snackbar,
    Stack,
    Step,
    StepButton,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import type { InvitationDetails, FormFields, GeneratedImage } from '../../shared/types';
import { api } from '../api';
import InvitationForm from '../form/InvitationForm';
import MainInfo from './pages/MainInfo';
import { ArrowBack } from '@mui/icons-material';

const STEPS = ['Основна информация', 'Изображение'];

interface BuilderProps {
    /** The event whose invitation is created, or edited if it already has one. */
    eventId: number;
    onBack: () => void;
}

export default function Builder({ eventId, onBack }: BuilderProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [fields, setFields] = useState<FormFields>({ showName: true, showAnswer: true });
    const [details, setDetails] = useState<InvitationDetails>({
        brideName: '',
        groomName: '',
        weddingDate: '',
        place: '',
        colors: ['#ffffff'],
    });
    const [loaded, setLoaded] = useState(false);
    // Slug of the event's saved invitation; null until it is first saved.
    const [slug, setSlug] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    // A new invitation defaults to the latest image; a saved one keeps exactly the image it was saved with.
    const selected = images.find((image) => image.id === selectedId) ?? (slug ? undefined : images[0]);

    /** Saves the invitation; resolves to whether the save succeeded. */
    const save = async (): Promise<boolean> => {
        setSaving(true);
        setError(null);
        try {
            const imageId = selected?.id ?? null;
            const form = slug
                ? await api.updateForm(slug, imageId, fields, details)
                : await api.publishForm(eventId, imageId, fields, details);
            setSlug(form.slug);
            setSelectedId(form.imageId);
            setSavedNotice(true);
            return true;
        } catch (e) {
            setError((e as Error).message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveAndNext = async () => {
        if (await save()) setActiveStep((step) => step + 1);
    };

    useEffect(() => {
        Promise.all([api.listImages(), api.getEvent(eventId)])
            .then(([loadedImages, event]) => {
                setImages(loadedImages);
                const { invitation } = event;
                if (invitation) {
                    setSlug(invitation.slug);
                    setSelectedId(invitation.imageId);
                    setFields({ showName: invitation.showName, showAnswer: invitation.showAnswer });
                    setDetails({
                        brideName: invitation.brideName,
                        groomName: invitation.groomName,
                        weddingDate: invitation.weddingDate,
                        place: invitation.place,
                        colors: invitation.colors,
                    });
                }
                setLoaded(true);
            })
            .catch((e: Error) => setError(e.message));
    }, [eventId]);

    const generate = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!prompt.trim() || generating) return;
        setGenerating(true);
        setError(null);
        try {
            const image = await api.generateImage(prompt);
            setImages((current) => [image, ...current]);
            setSelectedId(image.id);
            setPrompt('');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setGenerating(false);
        }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void generate();
        }
    };

    const detailsComplete = Boolean(
        details.brideName.trim() &&
            details.groomName.trim() &&
            details.weddingDate &&
            details.place.trim() &&
            details.colors.length > 0,
    );
    const canSave = !saving && detailsComplete && (fields.showName || fields.showAnswer);

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
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={onBack}>
                        Към събитието
                    </Button>
                </Box>
                <Typography variant="h4">{slug ? 'Редактирай поканата' : 'Създай своята покана'}</Typography>

                <Stepper nonLinear activeStep={activeStep}>
                    {STEPS.map((label, index) => (
                        <Step key={label}>
                            <StepButton onClick={() => setActiveStep(index)}>{label}</StepButton>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <MainInfo
                        details={details}
                        setDetails={setDetails}
                        fields={fields}
                        setFields={setFields}
                    />
                )}

                {activeStep === 1 && (
                    <Stack spacing={2}>
                        <Stack
                            component="form"
                            direction="row"
                            spacing={2}
                            onSubmit={generate}
                            sx={{ alignItems: 'flex-start' }}
                        >
                            <TextField
                                label="Describe the image"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                multiline
                                maxRows={4}
                                fullWidth
                                disabled={generating}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={generating || !prompt.trim()}
                                startIcon={generating ? <CircularProgress size={18} color="inherit" /> : undefined}
                                sx={{ flexShrink: 0, height: 56 }}
                            >
                                {generating ? 'Generating…' : 'Generate'}
                            </Button>
                        </Stack>
                    </Stack>
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
                        imageUrl={selected?.url ?? null}
                        page={activeStep}
                        onPageChange={setActiveStep}
                    />
                </Box>
            </Box>
        </Box>
    );
}
