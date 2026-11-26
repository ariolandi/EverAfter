/** Public URL of a published form, as opened by guests. */
export const shareUrlFor = (slug: string) => `${window.location.origin}/f/${slug}`;

/** A single guest's own invitation link. */
export const guestShareUrlFor = (token: string) => `${window.location.origin}/i/${token}`;

/** A guest group's personal invitation link. */
export const groupShareUrlFor = (token: string) => `${window.location.origin}/g/${token}`;
