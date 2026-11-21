import { useCallback, useState } from 'react';
import { errorMessage } from '../errors';

/**
 * Tracks one kind of async action: whether it is running and the error it last failed with.
 * `run` clears the previous error, and resolves to whether the action succeeded.
 */
export function useAsyncAction() {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
        setPending(true);
        setError(null);
        try {
            await action();
            return true;
        } catch (e) {
            setError(errorMessage(e));
            return false;
        } finally {
            setPending(false);
        }
    }, []);

    return { pending, error, setError, run };
}
