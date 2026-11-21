import { useState } from 'react';
import { useAsyncAction } from './useAsyncAction';

/**
 * State for deleting an item after the user confirms it: `ask` opens the confirmation for an item,
 * `confirm` deletes it and closes the confirmation, or keeps it open with the error if deleting fails.
 * Pass the result to `ConfirmDeleteDialog`.
 */
export function useConfirmDelete<T>(onDelete: (item: T) => Promise<void>) {
    const [target, setTarget] = useState<T | null>(null);
    const { pending, error, setError, run } = useAsyncAction();

    return {
        target,
        deleting: pending,
        error,
        ask: (item: T) => {
            setError(null);
            setTarget(item);
        },
        cancel: () => setTarget(null),
        confirm: async () => {
            if (target === null) return;
            if (await run(() => onDelete(target))) setTarget(null);
        },
    };
}

export type ConfirmDelete<T> = ReturnType<typeof useConfirmDelete<T>>;
