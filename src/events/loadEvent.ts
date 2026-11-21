import { api } from '../api';

/** An event with its guest list and guest groups, as the event page and the invitation builder need them. */
export async function loadEvent(eventId: number) {
    const [event, guests, groups] = await Promise.all([
        api.getEvent(eventId),
        api.listGuests(eventId),
        api.listGroups(eventId),
    ]);
    return { event, guests, groups };
}
