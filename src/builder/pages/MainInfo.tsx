import type { Dispatch, SetStateAction } from "react"
import { InputBase, Paper, Stack, TextField, Typography } from "@mui/material"
import {
    MAX_INVITATION_TEXT_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PLACE_LENGTH,
    type InvitationDetails,
    type FormFields,
} from "../../../shared/types"
import ColorPalette from "../ColorPalette"
import DateField from "../DateField"

interface MainInfoProps {
    details: InvitationDetails
    setDetails: Dispatch<SetStateAction<InvitationDetails>>
    fields: FormFields
    setFields: Dispatch<SetStateAction<FormFields>>
}

export default function MainInfo({ details, setDetails }: MainInfoProps) {
    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
                <TextField
                    required
                    label="Булка"
                    value={details.brideName}
                    onChange={(e) => setDetails((current) => ({ ...current, brideName: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                    size="small"
                    fullWidth
                />
                <Typography>&</Typography>
                <TextField
                    required
                    label="Младоженец"
                    value={details.groomName}
                    onChange={(e) => setDetails((current) => ({ ...current, groomName: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                    size="small"
                    fullWidth
                />
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
            <Stack spacing={1}>
                <Typography variant="subtitle2">Цветове</Typography>
                <ColorPalette
                    colors={details.colors}
                    onChange={(colors) => setDetails((current) => ({ ...current, colors }))}
                />
            </Stack>
        </Stack>
    )
}
