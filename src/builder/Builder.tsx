import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import type { InvitationDetails, FormFields, GeneratedImage, PublishedForm } from '../../shared/types';
import { api } from '../api';
import InvitationForm from '../form/InvitationForm';
import MainInfo from './pages/MainInfo';
import { ContentCopy } from '@mui/icons-material';

const STEPS = ['Основна информация', 'Изображение'];

interface BuilderProps {
    onPublished: (form: PublishedForm) => void;
}

export default function Builder({ onPublished }: BuilderProps) {
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
    const [publishing, setPublishing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const selected = images.find((image) => image.id === selectedId) ?? images[0];

    const publish = async () => {
        setPublishing(true);
        setError(null);
        try {
            const form = await api.publishForm(selected?.id ?? null, fields, details);
            setShareUrl(`${window.location.origin}/f/${form.slug}`);
            onPublished(form);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setPublishing(false);
        }
    };

    useEffect(() => {
        api.listImages()
            .then(setImages)
            .catch((e: Error) => setError(e.message));
    }, []);

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
    )

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
                <Typography variant="h4">Създай своята покана</Typography>

                <Stepper activeStep={activeStep}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <MainInfo
                        details={details}
                        setDetails={setDetails}
                        fields={fields}
                        setFields={setFields}
                        publishing={publishing}
                        publish={publish}
                        shareUrl={shareUrl}
                        error={error}
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
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                )}

                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Button disabled={activeStep === 0} onClick={() => setActiveStep((step) => step - 1)}>
                        Назад
                    </Button>
                    <Button
                        variant="contained"
                        disabled={activeStep === STEPS.length - 1}
                        onClick={() => setActiveStep((step) => step + 1)}
                    >
                        Напред
                    </Button>

                    <Box>
                        <Button
                            variant="outlined"
                            onClick={publish}
                            disabled={publishing || !detailsComplete || (!fields.showName && !fields.showAnswer)}
                        >
                            {publishing ? 'Publishing…' : 'Publish & get link'}
                        </Button>
                    </Box>
                    {shareUrl && (
                        <TextField
                            label="Share link"
                            value={shareUrl}
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
                                                onClick={() => void navigator.clipboard.writeText(shareUrl)}
                                            >
                                                <ContentCopy fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
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
                    <InvitationForm fields={fields} details={details} imageUrl={selected?.url ?? null} />
                </Box>
            </Box>
        </Box>
    );
}
