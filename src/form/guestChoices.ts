import type { GroupResponse, Menu, Transport } from '../../shared/types';

/**
 * How a guest's transport answer is built up: with no transport of their own they must still say whether they
 * want help, so 'none' is an answer that isn't finished yet.
 */
export type TransportDraft = Transport | 'none';

/** What each guest of a group has picked on the invitation's choice pages, by guest id. */
export interface GuestChoices {
    menus: Record<number, number>;
    accommodation: Record<number, boolean>;
    transport: Record<number, TransportDraft>;
}

export const noChoices: GuestChoices = { menus: {}, accommodation: {}, transport: {} };

export const ACCOMMODATION_LABELS = { yes: 'Ще се възползвам', no: 'Няма да се възползвам' } as const;

export const TRANSPORT_LABELS: Record<Transport, string> = {
    own: 'Имам собствен превоз',
    needsHelp: 'Нямам собствен превоз – бих се възползвал от помощ',
    arrangesOwn: 'Нямам собствен превоз – ще си осигуря сам',
};

/** The choices recorded in a group's sent answer, so the choice pages can show them. */
export function choicesFromResponse(response: GroupResponse): GuestChoices {
    const choices: GuestChoices = { menus: {}, accommodation: {}, transport: {} };
    for (const guest of response.guests) {
        if (guest.guestId === null) continue;
        if (guest.menuId !== null) choices.menus[guest.guestId] = guest.menuId;
        if (guest.accommodation !== null) choices.accommodation[guest.guestId] = guest.accommodation;
        if (guest.transport !== null) choices.transport[guest.guestId] = guest.transport;
    }
    return choices;
}

/** The lines that sum up a guest's choices next to their answer. */
export function describeChoices(
    menus: Menu[],
    choice: { menuId: number | null; accommodation: boolean | null; transport: TransportDraft | null },
): string[] {
    return [
        menus.find((m) => m.id === choice.menuId)?.name,
        choice.accommodation === null
            ? undefined
            : `Нощувка: ${choice.accommodation ? 'ще се възползва' : 'няма да се възползва'}`,
        choice.transport && choice.transport !== 'none' ? TRANSPORT_LABELS[choice.transport] : undefined,
    ].filter((line): line is string => Boolean(line));
}
