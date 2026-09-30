import type { Dispatch, SetStateAction } from "react"
import { Stack, TextField, Typography } from "@mui/material"
import type { InvitationDetails, FormFields } from "../../../shared/types"
import ColorPalette from "../ColorPalette"

interface MainInfoProps {
    details: InvitationDetails
    setDetails: Dispatch<SetStateAction<InvitationDetails>>
    fields: FormFields
    setFields: Dispatch<SetStateAction<FormFields>>
    publishing: boolean
    publish: () => void
    shareUrl: string | null
    error: string | null
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
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    size="small"
                    fullWidth
                />
                <Typography>&</Typography>
                <TextField
                    required
                    label="Младоженец"
                    value={details.groomName}
                    onChange={(e) => setDetails((current) => ({ ...current, groomName: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    size="small"
                    fullWidth
                />
            </Stack>
            <Stack direction="row" spacing={2}>
                <TextField
                    required
                    label="Дата на сватбата"
                    type="date"
                    value={details.weddingDate}
                    onChange={(e) => setDetails((current) => ({ ...current, weddingDate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    sx={{ flexShrink: 0, width: 240 }}
                />
                <TextField
                    required
                    label="Място"
                    value={details.place}
                    onChange={(e) => setDetails((current) => ({ ...current, place: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
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
