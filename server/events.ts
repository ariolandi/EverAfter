import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import {
  MAX_DISH_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_GROUP_SIZE,
  MAX_NAME_LENGTH,
  MAX_PLACE_LENGTH,
  MENU_COURSE_KEYS,
  SCHEDULE_TIME_PATTERN,
  type MenuCourses,
  type MenuInput,
  type ScheduleItemInput,
} from '../shared/types.js';
import { requireUser } from './auth.js';
import {
  addCoowner,
  areEventGuests,
  createEvent,
  createGroup,
  createGuest,
  createMenu,
  createScheduleItem,
  deleteCoowner,
  deleteEvent,
  deleteGroup,
  deleteGuest,
  deleteMenu,
  deleteScheduleItem,
  getEvent,
  listCoowners,
  listEvents,
  listGroups,
  listGuests,
  listMenus,
  listScheduleItems,
  normalizeEmail,
  setGuestIsChild,
  updateGroup,
  updateMenu,
  updateScheduleItem,
} from './db.js';

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

/** Responds 400 and returns undefined unless the body has a valid name (under `field`, "name" by default). */
function parseName(req: Request, res: Response, field = 'name') {
  const name = typeof req.body?.[field] === 'string' ? (req.body[field] as string).trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `${field} must be 1-${MAX_NAME_LENGTH} characters` });
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
  if (!name) return;
  const isChild: unknown = req.body?.isChild ?? false;
  if (typeof isChild !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'isChild must be a boolean' });
    return;
  }
  res.status(HttpStatus.CREATED).json(await createGuest(event.id, name, isChild));
});

eventRouter.patch('/:id/guests/:guestId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const isChild: unknown = req.body?.isChild;
  if (typeof isChild !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'isChild must be a boolean' });
    return;
  }
  const guestId = Number(req.params.guestId);
  const guest = Number.isInteger(guestId) ? await setGuestIsChild(event.id, guestId, isChild) : undefined;
  if (!guest) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'guest not found' });
    return;
  }
  res.json(guest);
});

/** Validates a group body, or responds 400 and returns undefined. Every guest must belong to the event. */
async function parseGroupInput(req: Request, res: Response, eventId: number) {
  const name = parseName(req, res);
  if (!name) return undefined;
  const guestIds: unknown = req.body?.guestIds;
  if (
    !Array.isArray(guestIds) ||
    guestIds.length === 0 ||
    guestIds.length > MAX_GROUP_SIZE ||
    !guestIds.every((id) => Number.isInteger(id))
  ) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `choose 1-${MAX_GROUP_SIZE} guests for the group` });
    return undefined;
  }
  const ids = [...new Set(guestIds as number[])];
  if (!(await areEventGuests(eventId, ids))) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'guest not found' });
    return undefined;
  }
  return { name, guestIds: ids };
}

eventRouter.get('/:id/groups', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(await listGroups(event.id));
});

eventRouter.post('/:id/groups', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const input = await parseGroupInput(req, res, event.id);
  if (!input) return;
  const token = crypto.randomBytes(9).toString('base64url');
  res.status(HttpStatus.CREATED).json(await createGroup(event.id, input.name, token, input.guestIds));
});

eventRouter.put('/:id/groups/:groupId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const groupId = Number(req.params.groupId);
  const input = await parseGroupInput(req, res, event.id);
  if (!input) return;
  const group = Number.isInteger(groupId)
    ? await updateGroup(event.id, groupId, input.name, input.guestIds)
    : undefined;
  if (!group) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'group not found' });
    return;
  }
  res.json(group);
});

eventRouter.delete('/:id/groups/:groupId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || !(await deleteGroup(event.id, groupId))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'group not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
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

/** Validates a menu body, or responds 400 and returns undefined. Every course needs a dish. */
function parseMenuInput(req: Request, res: Response): MenuInput | undefined {
  const name = parseName(req, res);
  if (!name) return undefined;
  const isChild: unknown = req.body?.isChild ?? false;
  if (typeof isChild !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'isChild must be a boolean' });
    return undefined;
  }
  const courses = {} as MenuCourses;
  for (const course of MENU_COURSE_KEYS) {
    const dish = typeof req.body?.[course] === 'string' ? (req.body[course] as string).trim() : '';
    if (!dish || dish.length > MAX_DISH_LENGTH) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: `${course} must be 1-${MAX_DISH_LENGTH} characters` });
      return undefined;
    }
    courses[course] = dish;
  }
  return { name, isChild, ...courses };
}

eventRouter.get('/:id/menus', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(await listMenus(event.id));
});

eventRouter.post('/:id/menus', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const input = parseMenuInput(req, res);
  if (input) res.status(HttpStatus.CREATED).json(await createMenu(event.id, input));
});

eventRouter.put('/:id/menus/:menuId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const input = parseMenuInput(req, res);
  if (!input) return;
  const menuId = Number(req.params.menuId);
  const menu = Number.isInteger(menuId) ? await updateMenu(event.id, menuId, input) : undefined;
  if (!menu) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'menu not found' });
    return;
  }
  res.json(menu);
});

eventRouter.delete('/:id/menus/:menuId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const menuId = Number(req.params.menuId);
  if (!Number.isInteger(menuId) || !(await deleteMenu(event.id, menuId))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'menu not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});

/** Validates a schedule item body, or responds 400 and returns undefined. Title, start time and place are all required. */
function parseScheduleItemInput(req: Request, res: Response): ScheduleItemInput | undefined {
  const title = parseName(req, res, 'title');
  if (!title) return undefined;
  const startTime: unknown = req.body?.startTime;
  if (typeof startTime !== 'string' || !SCHEDULE_TIME_PATTERN.test(startTime)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'startTime must be a time as HH:MM' });
    return undefined;
  }
  const place = typeof req.body?.place === 'string' ? req.body.place.trim() : '';
  if (!place || place.length > MAX_PLACE_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `place must be 1-${MAX_PLACE_LENGTH} characters` });
    return undefined;
  }
  return { title, startTime, place };
}

eventRouter.get('/:id/schedule', async (req, res) => {
  const event = await findEvent(req, res);
  if (event) res.json(await listScheduleItems(event.id));
});

eventRouter.post('/:id/schedule', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const input = parseScheduleItemInput(req, res);
  if (input) res.status(HttpStatus.CREATED).json(await createScheduleItem(event.id, input));
});

eventRouter.put('/:id/schedule/:itemId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const input = parseScheduleItemInput(req, res);
  if (!input) return;
  const itemId = Number(req.params.itemId);
  const item = Number.isInteger(itemId) ? await updateScheduleItem(event.id, itemId, input) : undefined;
  if (!item) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'schedule item not found' });
    return;
  }
  res.json(item);
});

eventRouter.delete('/:id/schedule/:itemId', async (req, res) => {
  const event = await findEvent(req, res);
  if (!event) return;
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId) || !(await deleteScheduleItem(event.id, itemId))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'schedule item not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});
