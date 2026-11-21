import type { SvgIconProps } from '@mui/material';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import HighlightOff from '@mui/icons-material/HighlightOff';

/** A green tick for a guest who will come, a red cross for one who won't. */
export default function AnswerIcon({ answer, fontSize }: { answer: boolean; fontSize?: SvgIconProps['fontSize'] }) {
    return answer ? (
        <CheckCircleOutlined fontSize={fontSize} color="success" />
    ) : (
        <HighlightOff fontSize={fontSize} color="error" />
    );
}
