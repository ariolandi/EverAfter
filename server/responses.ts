import { MAX_GUEST_NOTES_LENGTH, MAX_ROOM_WITH_LENGTH, menusForGuest, TRANSPORT_OPTIONS, type Menu, type Transport } from '../shared/types.js';

/** The recorded form of one guest's answer. */
export interface ParsedAnswer {
  answer: boolean | null;
  menuId: number | null;
  accommodation: boolean | null;
  transport: Transport | null;
  /** Left out (and so left as it was when an answer is replaced) unless the answer says who to share a room with. */
  roomWith?: string | null;
  /** Left out (and so left as it was) unless the answer carries notes. */
  notes?: string | null;
}

type Parsed = { ok: true; values: ParsedAnswer } | { ok: false; error: string };

/**
 * Checks one guest's answer against the invitation. A guest who comes (or any guest, when the invitation does
 * not ask whether they will) must pick a menu, if one is meant for them, say whether they use the accommodation
 * and say how they travel. Anything sent for a guest who does not come is dropped.
 */
export function parseGuestAnswer(
  guest: { name: string; isChild: boolean },
  context: { showAnswer: boolean; menus: Menu[] },
  raw: { answer?: unknown; menuId?: unknown; accommodation?: unknown; transport?: unknown; roomWith?: unknown; notes?: unknown },
): Parsed {
  const { showAnswer, menus } = context;
  if (showAnswer && typeof raw.answer !== 'boolean') {
    return { ok: false, error: 'please answer yes or no for every guest' };
  }
  const answer = showAnswer ? (raw.answer as boolean) : null;
  if (answer === false) {
    return { ok: true, values: { answer, menuId: null, accommodation: null, transport: null, roomWith: null, notes: null } };
  }
  // Children's menus are for children only.
  const options = menusForGuest(menus, guest.isChild);
  if (options.length > 0 && !options.some((menu) => menu.id === raw.menuId)) {
    return { ok: false, error: `pick a menu for ${guest.name}` };
  }
  if (typeof raw.accommodation !== 'boolean') {
    return { ok: false, error: `say whether ${guest.name} needs accommodation` };
  }
  if (!TRANSPORT_OPTIONS.includes(raw.transport as Transport)) {
    return { ok: false, error: `say how ${guest.name} travels` };
  }
  let roomWith: string | null | undefined;
  if (raw.roomWith !== undefined) {
    roomWith = typeof raw.roomWith === 'string' ? raw.roomWith.trim() || null : null;
    if (typeof raw.roomWith !== 'string' || (roomWith?.length ?? 0) > MAX_ROOM_WITH_LENGTH) {
      return { ok: false, error: `roomWith must be at most ${MAX_ROOM_WITH_LENGTH} characters` };
    }
    // Only guests who stay the night share a room.
    if (!raw.accommodation) roomWith = null;
  }
  let notes: string | null | undefined;
  if (raw.notes !== undefined) {
    notes = typeof raw.notes === 'string' ? raw.notes.trim() || null : null;
    if (typeof raw.notes !== 'string' || (notes?.length ?? 0) > MAX_GUEST_NOTES_LENGTH) {
      return { ok: false, error: `notes must be at most ${MAX_GUEST_NOTES_LENGTH} characters` };
    }
  }
  return {
    ok: true,
    values: {
      answer,
      menuId: options.length > 0 ? (raw.menuId as number) : null,
      accommodation: raw.accommodation,
      transport: raw.transport as Transport,
      ...(roomWith !== undefined && { roomWith }),
      ...(notes !== undefined && { notes }),
    },
  };
}
