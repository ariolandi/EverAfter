import { useState, type FormEvent } from 'react';
import { useAsyncAction } from '../hooks/useAsyncAction';

/**
 * The flow of an answer form: submitting the form opens `ConfirmSubmitDialog` (spread `dialogProps` on it),
 * and confirming there sends the answer. `submit` is omitted in previews, which then can't be sent.
 */
export function useConfirmedSubmit(canSubmit: boolean, submit: (() => Promise<void>) | undefined) {
    const [confirming, setConfirming] = useState(false);
    // Whether the answer was sent from this page.
    const [sent, setSent] = useState(false);
    const { pending, error, run } = useAsyncAction();

    const review = (event: FormEvent) => {
        event.preventDefault();
        if (submit && canSubmit) setConfirming(true);
    };

    const send = async () => {
        if (!submit) return;
        if (await run(submit)) setSent(true);
        setConfirming(false);
    };

    return {
        review,
        sent,
        submitting: pending,
        error,
        dialogProps: {
            open: confirming,
            submitting: pending,
            onCancel: () => setConfirming(false),
            onConfirm: () => void send(),
        },
    };
}
