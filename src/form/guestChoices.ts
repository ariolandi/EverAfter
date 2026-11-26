import type { GuestResponse, Menu, Transport } from '../../shared/types';

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
    /** Who each guest would like to share a room with, by guest id. */
    roomWith: Record<number, string>;
}

export const noChoices: GuestChoices = { menus: {}, accommodation: {}, transport: {}, roomWith: {} };

export const ACCOMMODATION_LABELS = { yes: 'Ще се възползвам', no: 'Няма да се възползвам' } as const;

export const TRANSPORT_LABELS: Record<Transport, string> = {
    own: 'Имам собствен превоз',
    needsHelp: 'Нямам собствен превоз – бих се възползвал от помощ',
    arrangesOwn: 'Нямам собствен превоз – ще си осигуря сам',
};

/** Transport answers in a few words, for the organizers' table. */
export const TRANSPORT_SHORT_LABELS: Record<Transport, string> = {
    own: 'Собствен превоз',
    needsHelp: 'Иска помощ',
    arrangesOwn: 'Ще се оправи сам',
};

/** The choices recorded in guests' sent answers (by guest id), so the choice pages can show them. */
export function choicesFromResponses(responses: Record<number, GuestResponse>): GuestChoices {
    const choices: GuestChoices = { menus: {}, accommodation: {}, transport: {}, roomWith: {} };
    for (const [id, response] of Object.entries(responses)) {
        const guestId = Number(id);
        if (response.menuId !== null) choices.menus[guestId] = response.menuId;
        if (response.accommodation !== null) choices.accommodation[guestId] = response.accommodation;
        if (response.transport !== null) choices.transport[guestId] = response.transport;
        if (response.roomWith) choices.roomWith[guestId] = response.roomWith;
    }
    return choices;
}

/** The lines that sum up a guest's choices next to their answer. */
export function describeChoices(
    menus: Menu[],
    choice: { menuId: number | null; accommodation: boolean | null; transport: TransportDraft | null; roomWith?: string | null },
): string[] {
    return [
        menus.find((m) => m.id === choice.menuId)?.name,
        choice.accommodation === null
            ? undefined
            : `Нощувка: ${choice.accommodation ? 'ще се възползва' : 'няма да се възползва'}`,
        choice.roomWith ? `Споделя стая с: ${choice.roomWith}` : undefined,
        choice.transport && choice.transport !== 'none' ? TRANSPORT_LABELS[choice.transport] : undefined,
    ].filter((line): line is string => Boolean(line));
}
