import { IconButton, type IconButtonProps } from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';

/** Bin icon button; its `aria-label` names what it deletes, e.g. "Изтрий Сватба". */
export default function DeleteIconButton(props: IconButtonProps & { 'aria-label': string }) {
    return (
        <IconButton {...props}>
            <DeleteOutlined />
        </IconButton>
    );
}
