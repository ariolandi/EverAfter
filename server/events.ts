import { Router, type Request, type Response } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { requireUser } from './auth.js';
import { createEvent, createGuest, deleteEvent, deleteGuest, getEvent, listEvents, listGuests } from './db.js';

const MAX_NAME_LENGTH = 100;

export const eventRouter = Router();

eventRouter.use(requireUser);

/** Loads the signed-in user's event from the :id param, or responds 404 and returns undefined. */
async function findEvent(req: Request<{ id: string }>, res: Response) {
  const id = Number(req.params.id);
  const event = Number.isInteger(id) ? await getEvent(req.user!.id, id) : undefined;
  if (!event) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'event not found' });
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
  res.json(await listEvents(req.user!.id));
});

eventRouter.post('/', async (req, res) => {
  const name = parseName(req, res);
  if (name) res.status(HttpStatus.CREATED).json(await createEvent(req.user!.id, name));
});

eventRouter.get('/:id', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(event);
});

eventRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await deleteEvent(req.user!.id, id))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'event not found' });
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
