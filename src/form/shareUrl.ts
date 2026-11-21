/** Public URL of a published form, as opened by guests. */
export const shareUrlFor = (slug: string) => `${window.location.origin}/f/${slug}`;

/** A guest group's personal invitation link. */
export const groupShareUrlFor = (token: string) => `${window.location.origin}/g/${token}`;
