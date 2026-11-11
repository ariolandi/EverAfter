import { Router, type Request, type Response } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { requireUser } from './auth.js';
import {
  addCoowner,
  createEvent,
  createGuest,
  deleteCoowner,
  deleteEvent,
  deleteGuest,
  getEvent,
  listCoowners,
  listEvents,
  listGuests,
  normalizeEmail,
} from './db.js';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

export const eventRouter = Router();

eventRouter.use(requireUser);

/** Loads the event from the :id param if the signed-in user owns or co-owns it, or responds 404. */
async function findEvent(req: Request<{ id: string }>, res: Response) {
  const id = Number(req.params.id);
  const event = Number.isInteger(id) ? await getEvent(req.user!, id) : undefined;
  if (!event) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'event not found' });
  }
  return event;
}

/** Like findEvent, but also responds 403 unless the signed-in user is the event's owner. */
async function findOwnedEvent(req: Request<{ id: string }>, res: Response) {
  const event = await findEvent(req, res);
  if (event && !event.isOwner) {
    res.status(HttpStatus.FORBIDDEN).json({ error: 'only the event owner can do this' });
    return undefined;
  }
  return event;
}

/** Responds 400 and returns undefined unless the body has a valid name. */
function parseName(req: Request, res: Response) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `name must be 1-${MAX_NAME_LENGTH} characters` });
    return undefined;
  }
  return name as string;
}

eventRouter.get('/', async (req, res) => {
  res.json(await listEvents(req.user!));
});

eventRouter.post('/', async (req, res) => {
  const name = parseName(req, res);
  if (name) res.status(HttpStatus.CREATED).json(await createEvent(req.user!, name));
});

eventRouter.get('/:id', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(event);
});

eventRouter.delete('/:id', async (req, res) => {
  const event = await findOwnedEvent(req, res);
  if (!event) return;
  await deleteEvent(req.user!.id, event.id);
  res.status(HttpStatus.NO_CONTENT).end();
});

eventRouter.get('/:id/coowners', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(await listCoowners(event.id));
});

eventRouter.post('/:id/coowners', async (req, res) => {
  const event = await findOwnedEvent(req, res);
  if (!event) return;
  const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  if (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'enter a valid email address' });
    return;
  }
  if (email === normalizeEmail(req.user!.email)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'you already own this event' });
    return;
  }
  const coowner = await addCoowner(event.id, email);
  if (!coowner) {
    res.status(HttpStatus.CONFLICT).json({ error: 'this person is already a co-owner' });
    return;
  }
  res.status(HttpStatus.CREATED).json(coowner);
});

eventRouter.delete('/:id/coowners/:coownerId', async (req, res) => {
  const event = await findOwnedEvent(req, res);
  if (!event) return;
  const coownerId = Number(req.params.coownerId);
  if (!Number.isInteger(coownerId) || !(await deleteCoowner(event.id, coownerId))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'co-owner not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});

eventRouter.get('/:id/guests', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(await listGuests(event.id));
});

eventRouter.post('/:id/guests', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const name = parseName(req, res);
  if (name) res.status(HttpStatus.CREATED).json(await createGuest(event.id, name));
});

eventRouter.delete('/:id/guests/:guestId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const guestId = Number(req.params.guestId);
  if (!Number.isInteger(guestId) || !(await deleteGuest(event.id, guestId))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'guest not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});
