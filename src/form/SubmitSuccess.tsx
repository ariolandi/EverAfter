import { Alert, AlertTitle } from '@mui/material';

/** Shown once an answer has been sent. */
export default function SubmitSuccess() {
    return (
        <Alert severity="success" role="status">
            <AlertTitle>Отговорът е изпратен успешно!</AlertTitle>
            Благодарим ви, че отговорихте на поканата.
        </Alert>
    );
}
