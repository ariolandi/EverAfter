import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, Guest, Menu } from '../shared/types.js';
import { createGuest, createMenu, deleteMenu, getEvent, listMenus, setGuestIsChild, updateMenu } from './db.js';
import { eventRouter } from './events.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  createGuest: vi.fn(),
  createMenu: vi.fn(),
  deleteMenu: vi.fn(),
  getEvent: vi.fn(),
  listMenus: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  setGuestIsChild: vi.fn(),
  updateMenu: vi.fn(),
}));

const event: EventInfo = {
  id: 1,
  name: 'Сватба',
  createdAt: '2026-11-01T10:00:00.000Z',
  guestCount: 2,
  invitation: null,
  // Co-owners manage guests and menus too, so the tests use one.
  isOwner: false,
  ownerName: 'Ана',
};

const child: Guest = { id: 5, name: 'Ники', groupId: null, isChild: true, createdAt: '2026-11-01T10:00:00.000Z' };

const menu: Menu = {
  id: 20,
  name: 'Детско меню',
  isChild: true,
  salad: 'Доматена салата',
  appetizer: 'Палачинки',
  mainCourse: 'Пилешки хапки',
  createdAt: '2026-11-01T10:00:00.000Z',
};
const menuBody = { name: 'Детско меню', isChild: true, salad: 'Доматена салата', appetizer: 'Палачинки', mainCourse: 'Пилешки хапки' };

const app = appWith('/api/events', eventRouter);

beforeEach(() => {
  vi.mocked(getEvent).mockResolvedValue(event);
});

describe('child guests', () => {
  it('adds a guest as a child', async () => {
    vi.mocked(createGuest).mockResolvedValue(child);
    const res = await request(app).post('/api/events/1/guests').send({ name: ' Ники ', isChild: true });
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createGuest).toHaveBeenCalledWith(1, 'Ники', true);
  });

  it('adds an adult when isChild is left out', async () => {
    vi.mocked(createGuest).mockResolvedValue({ ...child, isChild: false });
    await request(app).post('/api/events/1/guests').send({ name: 'Ана' });
    expect(createGuest).toHaveBeenCalledWith(1, 'Ана', false);
  });

  it('rejects an isChild that is not a boolean', async () => {
    const res = await request(app).post('/api/events/1/guests').send({ name: 'Ники', isChild: 'yes' });
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createGuest).not.toHaveBeenCalled();
  });

  it('marks an existing guest as a child', async () => {
    vi.mocked(setGuestIsChild).mockResolvedValue(child);
    const res = await request(app).patch('/api/events/1/guests/5').send({ isChild: true });
    expect(res.status).toBe(HttpStatus.OK);
    expect(setGuestIsChild).toHaveBeenCalledWith(1, 5, true);
    expect(res.body).toEqual(child);
  });

  it('is 400 without a boolean isChild and 404 for a guest of another event', async () => {
    expect((await request(app).patch('/api/events/1/guests/5').send({})).status).toBe(HttpStatus.BAD_REQUEST);
    vi.mocked(setGuestIsChild).mockResolvedValue(undefined);
    expect((await request(app).patch('/api/events/1/guests/99').send({ isChild: false })).status).toBe(
      HttpStatus.NOT_FOUND,
    );
  });
});

describe('menu routes', () => {
  it('require a signed-in user', async () => {
    const res = await request(appWith('/api/events', eventRouter, null)).get('/api/events/1/menus');
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('are 404 for an event the user cannot manage', async () => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const res = await request(app).get('/api/events/2/menus');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(listMenus).not.toHaveBeenCalled();
  });

  it('list the event’s menus', async () => {
    vi.mocked(listMenus).mockResolvedValue([menu]);
    const res = await request(app).get('/api/events/1/menus');
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toEqual([menu]);
    expect(listMenus).toHaveBeenCalledWith(1);
  });

  it('create a menu with trimmed dishes', async () => {
    vi.mocked(createMenu).mockResolvedValue(menu);
    const res = await request(app)
      .post('/api/events/1/menus')
      .send({ ...menuBody, name: ' Детско меню ', salad: ' Доматена салата ' });
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createMenu).toHaveBeenCalledWith(1, menuBody);
  });

  it('create an adults’ menu when isChild is left out', async () => {
    vi.mocked(createMenu).mockResolvedValue({ ...menu, isChild: false });
    const adultBody = { ...menuBody, isChild: undefined };
    await request(app).post('/api/events/1/menus').send(adultBody);
    expect(createMenu).toHaveBeenCalledWith(1, { ...menuBody, isChild: false });
  });

  it.each([
    ['a missing name', { ...menuBody, name: '' }],
    ['a missing salad', { ...menuBody, salad: undefined }],
    ['a blank appetizer', { ...menuBody, appetizer: '  ' }],
    ['a too long main course', { ...menuBody, mainCourse: 'x'.repeat(201) }],
    ['an isChild that is not a boolean', { ...menuBody, isChild: 1 }],
  ])('reject %s', async (_case, body) => {
    const res = await request(app).post('/api/events/1/menus').send(body);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createMenu).not.toHaveBeenCalled();
  });

  it('update a menu', async () => {
    vi.mocked(updateMenu).mockResolvedValue({ ...menu, mainCourse: 'Кюфтенца' });
    const res = await request(app)
      .put('/api/events/1/menus/20')
      .send({ ...menuBody, mainCourse: 'Кюфтенца' });
    expect(res.status).toBe(HttpStatus.OK);
    expect(updateMenu).toHaveBeenCalledWith(1, 20, { ...menuBody, mainCourse: 'Кюфтенца' });
  });

  it('are 404 when updating a menu of another event', async () => {
    vi.mocked(updateMenu).mockResolvedValue(undefined);
    const res = await request(app).put('/api/events/1/menus/77').send(menuBody);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('delete a menu', async () => {
    vi.mocked(deleteMenu).mockResolvedValue(true);
    const res = await request(app).delete('/api/events/1/menus/20');
    expect(res.status).toBe(HttpStatus.NO_CONTENT);
    expect(deleteMenu).toHaveBeenCalledWith(1, 20);
  });

  it('are 404 when deleting an unknown menu', async () => {
    vi.mocked(deleteMenu).mockResolvedValue(false);
    const res = await request(app).delete('/api/events/1/menus/abc');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(deleteMenu).not.toHaveBeenCalled();
  });
});
