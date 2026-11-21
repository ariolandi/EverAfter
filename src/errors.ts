/** The message to show for a failed request or action. */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
