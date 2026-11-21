const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD → dd/mm/yyyy; anything else comes back as ''. */
export function isoToDisplayDate(iso: string): string {
    const match = iso.match(ISO_DATE);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** A date written out the way invitations write it, e.g. "12 юни 2027 г.". */
export const formatLongDate = (date: Date): string =>
    date.toLocaleDateString('BG', { day: 'numeric', month: 'long', year: 'numeric' });

/** YYYY-MM-DD → a long date such as "12 юни 2027 г."; anything else comes back as ''. */
export function isoToLongDate(iso: string): string {
    const match = iso.match(ISO_DATE);
    if (!match) return '';
    const [, year, month, day] = match.map(Number);
    // Built from parts so the date is local and doesn't shift a day in timezones west of UTC.
    return formatLongDate(new Date(year, month - 1, day));
}

/** Today in the user's time zone, as YYYY-MM-DD. */
export function todayIso(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whether a YYYY-MM-DD date is before today. */
export function isPastDate(iso: string): boolean {
    return iso !== '' && iso < todayIso();
}
