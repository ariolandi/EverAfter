/** Joins guest names the way an invitation addresses them: "Иван", "Иван и Мария", "Иван, Мария и Петър". */
export function joinGuestNames(names: string[]): string {
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}`;
}

/** A group's members, in the order the group lists them. */
export function guestsOf<G extends { id: number }>(group: { guestIds: number[] }, guests: G[]): G[] {
    return group.guestIds.flatMap((id) => guests.filter((guest) => guest.id === id));
}

/** How a group is listed: its members' names, or a note that it has none yet. */
export function groupGuestNames(group: { guestIds: number[] }, guests: { id: number; name: string }[]): string {
    return joinGuestNames(guestsOf(group, guests).map((guest) => guest.name)) || 'Няма гости';
}
