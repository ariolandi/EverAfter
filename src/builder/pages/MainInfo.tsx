import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import CloseIcon from "@mui/icons-material/Close"
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate"
import {
    MAX_INVITATION_TEXT_LENGTH,
    MAX_NAME_LENGTH,
    MAX_ORGANIZERS,
    MAX_PLACE_LENGTH,
    MAX_UPLOAD_BYTES,
    type InvitationDetails,
    type FormFields,
} from "../../../shared/types"
import { api } from "../../api"
import { errorMessage } from "../../errors"
import ColorPalette from "../ColorPalette"
import DateField from "../DateField"

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** The picture shown behind the invitation. */
export interface BackgroundImage {
    id: number
    url: string
}

interface MainInfoProps {
    details: InvitationDetails
    setDetails: Dispatch<SetStateAction<InvitationDetails>>
    fields: FormFields
    setFields: Dispatch<SetStateAction<FormFields>>
    image?: BackgroundImage | null
    onImageChange?: (image: BackgroundImage | null) => void
}

export default function MainInfo({ details, setDetails, image = null, onImageChange }: MainInfoProps) {
    const fileInput = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [imageError, setImageError] = useState<string | null>(null)

    const setOrganizer = (index: number, name: string) =>
        setDetails((current) => ({
            ...current,
            organizers: current.organizers.map((existing, i) => (i === index ? name : existing)),
        }))
    const addOrganizer = () => setDetails((current) => ({ ...current, organizers: [...current.organizers, ""] }))
    const removeOrganizer = (index: number) =>
        setDetails((current) => ({ ...current, organizers: current.organizers.filter((_, i) => i !== index) }))

    const upload = async (file: File) => {
        setImageError(null)
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setImageError("Изберете снимка във формат JPEG, PNG или WebP")
            return
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            setImageError(`Снимката е твърде голяма (най-много ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`)
            return
        }
        setUploading(true)
        try {
            const { id, url } = await api.uploadImage(file)
            onImageChange?.({ id, url })
        } catch (e) {
            setImageError(errorMessage(e))
        } finally {
            setUploading(false)
        }
    }

    return (
        <Stack spacing={2}>
            <Stack spacing={1}>
                {details.organizers.map((name, index) => (
                    <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <TextField
                            required
                            label={index === 0 ? "Организатор" : "Съорганизатор"}
                            value={name}
                            onChange={(e) => setOrganizer(index, e.target.value)}
                            slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                            size="small"
                            fullWidth
                        />
                        {index > 0 && (
                            <IconButton aria-label="Премахни съорганизатора" size="small" onClick={() => removeOrganizer(index)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                ))}
                {details.organizers.length < MAX_ORGANIZERS && (
                    <Box>
                        <Button size="small" startIcon={<AddIcon />} onClick={addOrganizer}>
                            Добави съорганизатор
                        </Button>
                    </Box>
                )}
            </Stack>
            <Stack direction="row" spacing={2}>
                <DateField
                    required
                    label="Дата на сватбата"
                    disablePast
                    value={details.weddingDate}
                    onChange={(weddingDate) => setDetails((current) => ({ ...current, weddingDate }))}
                    size="small"
                    sx={{ flexShrink: 0, width: 240 }}
                />
                <TextField
                    required
                    label="Място"
                    value={details.place}
                    onChange={(e) => setDetails((current) => ({ ...current, place: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: MAX_PLACE_LENGTH } }}
                    size="small"
                    fullWidth
                />
            </Stack>
            <TextField
                label="Текст на поканата"
                value={details.invitationText}
                onChange={(e) => setDetails((current) => ({ ...current, invitationText: e.target.value }))}
                // A plain textarea (not MUI's autosizing one), so the plaque keeps its height however long the text is.
                slotProps={{
                    input: { inputComponent: 'textarea' },
                    htmlInput: { rows: 4, maxLength: MAX_INVITATION_TEXT_LENGTH },
                }}
                sx={{ '& textarea': { resize: 'none' } }}
                size="small"
                fullWidth
            />
            <Stack spacing={1}>
                <Typography variant="subtitle2">Снимка за фон</Typography>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    {image && (
                        <Box
                            component="img"
                            src={image.url}
                            alt="Фон на поканата"
                            sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1 }}
                        />
                    )}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddPhotoAlternateIcon />}
                        disabled={uploading}
                        onClick={() => fileInput.current?.click()}
                    >
                        {uploading ? "Качване…" : image ? "Смени снимката" : "Добави снимка"}
                    </Button>
                    {image && (
                        <Button size="small" color="inherit" onClick={() => onImageChange?.(null)}>
                            Премахни
                        </Button>
                    )}
                    <input
                        ref={fileInput}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        hidden
                        data-testid="background-input"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            // Clear the input so picking the same file again still fires a change.
                            e.target.value = ""
                            if (file) void upload(file)
                        }}
                    />
                </Stack>
                {imageError && <Alert severity="error">{imageError}</Alert>}
            </Stack>
            <Stack spacing={1}>
                <Typography variant="subtitle2">Цветове</Typography>
                <ColorPalette
                    palette={details}
                    onChange={(palette) => setDetails((current) => ({ ...current, ...palette }))}
                />
            </Stack>
        </Stack>
    )
}
