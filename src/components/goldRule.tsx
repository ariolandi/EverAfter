import { Divider } from "@mui/material";

/** A thin gold rule that sets off a part of the cover text. */
export function GoldRule() {
    return <Divider aria-hidden sx={{ width: '40%', my: 1, borderColor: 'primary.main' }} />;
}