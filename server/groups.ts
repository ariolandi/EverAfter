import { Router } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { menusForGuest, TRANSPORT_OPTIONS, type GroupInvitation, type Transport } from '../shared/types.js';
import { createGroupResponse, getGroupInvitation } from './db.js';

/** Public routes behind a group's personal invitation link: anyone with the token can view and answer once. */
export const groupRouter = Router();

groupRouter.get('/:token', async (req, res) => {
  const found = await getGroupInvitation(req.params.token);
  if (!found) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'invitation not found' });
    return;
  }
  if (!found.form) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'the invitation has not been published yet' });
    return;
  }
  const invitation: GroupInvitation = {
    form: found.form.form,
    schedule: found.schedule,
    groupName: found.groupName,
    guests: found.guests,
    menus: found.menus,
    response: found.response,
  };
  res.json(invitation);
});

groupRouter.post('/:token/responses', async (req, res) => {
  const found = await getGroupInvitation(req.params.token);
  if (!found?.form) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'invitation not found' });
    return;
  }
  if (found.response) {
    res.status(HttpStatus.CONFLICT).json({ error: 'this invitation has already been answered' });
    return;
  }
  const { form } = found.form;
  const answers: unknown = req.body?.answers;
  if (!Array.isArray(answers)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'answers are required' });
    return;
  }
  const byGuest = new Map<unknown, unknown>(answers.map((a) => [a?.guestId, a?.answer]));
  // Exactly one answer per guest in the group, so nobody is skipped or answered for twice.
  if (
    found.guests.length === 0 ||
    byGuest.size !== answers.length ||
    answers.length !== found.guests.length ||
    !found.guests.every((g) => byGuest.has(g.id))
  ) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'answer for every guest in the group' });
    return;
  }
  if (form.showAnswer && !found.guests.every((g) => typeof byGuest.get(g.id) === 'boolean')) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'please answer yes or no for every guest' });
    return;
  }
  const menuByGuest = new Map<unknown, unknown>(answers.map((a) => [a?.guestId, a?.menuId]));
  const accommodationByGuest = new Map<unknown, unknown>(answers.map((a) => [a?.guestId, a?.accommodation]));
  const transportByGuest = new Map<unknown, unknown>(answers.map((a) => [a?.guestId, a?.transport]));
  const picks: { menuId: number | null; accommodation: boolean | null; transport: Transport | null }[] = [];
  for (const guest of found.guests) {
    const attending = !form.showAnswer || byGuest.get(guest.id) === true;
    const options = menusForGuest(found.menus, guest.isChild);
    const menuId = menuByGuest.get(guest.id);
    // Only guests who come choose a menu, and only from the ones meant for them: children's menus are for children.
    if (!attending) {
      picks.push({ menuId: null, accommodation: null, transport: null });
      continue;
    }
    if (options.length > 0 && !options.some((menu) => menu.id === menuId)) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: `pick a menu for ${guest.name}` });
      return;
    }
    const accommodation = accommodationByGuest.get(guest.id);
    if (typeof accommodation !== 'boolean') {
      res.status(HttpStatus.BAD_REQUEST).json({ error: `say whether ${guest.name} needs accommodation` });
      return;
    }
    const transport = transportByGuest.get(guest.id);
    if (!TRANSPORT_OPTIONS.includes(transport as Transport)) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: `say how ${guest.name} travels` });
      return;
    }
    picks.push({
      menuId: options.length > 0 ? (menuId as number) : null,
      accommodation,
      transport: transport as Transport,
    });
  }
  const response = await createGroupResponse(
    found.form.id,
    found.groupId,
    found.guests.map((g, i) => ({
      guestId: g.id,
      name: g.name,
      answer: form.showAnswer ? (byGuest.get(g.id) as boolean) : null,
      ...picks[i],
    })),
  );
  if (!response) {
    res.status(HttpStatus.CONFLICT).json({ error: 'this invitation has already been answered' });
    return;
  }
  res.status(HttpStatus.CREATED).json(response);
});
