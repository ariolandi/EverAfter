/** Compares by name the way Bulgarian readers expect a list to be ordered. */
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'bg');

/** A copy of the list, ordered by name. */
export const sortByName = <T extends { name: string }>(list: T[]): T[] => [...list].sort(byName);
