import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, GuestGroup } from '../shared/types.js';
import { areEventGuests, createGroup, deleteGroup, getEvent, listGroups, updateGroup } from './db.js';
import { eventRouter } from './events.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  addCoowner: vi.fn(),
  areEventGuests: vi.fn(),
  createEvent: vi.fn(),
  createGroup: vi.fn(),
  createGuest: vi.fn(),
  createSession: vi.fn(),
  deleteCoowner: vi.fn(),
  deleteEvent: vi.fn(),
  deleteGroup: vi.fn(),
  deleteGuest: vi.fn(),
  deleteSession: vi.fn(),
  getEvent: vi.fn(),
  getSessionUser: vi.fn(),
  listCoowners: vi.fn(),
  listEvents: vi.fn(),
  listGroups: vi.fn(),
  listGuests: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  updateGroup: vi.fn(),
  upsertGoogleUser: vi.fn(),
}));

const event: EventInfo = {
  id: 1,
  name: 'Сватба',
  createdAt: '2026-11-01T10:00:00.000Z',
  guestCount: 2,
  invitation: null,
  // Co-owners manage groups too, so the tests use one.
  isOwner: false,
  ownerName: 'Ана',
};

const group: GuestGroup = {
  id: 10,
  name: 'Иванови',
  token: 'tok',
  guestIds: [1, 2],
  response: null,
  createdAt: '2026-11-01T10:00:00.000Z',
};

const app = appWith('/api/events', eventRouter);

describe('guest group routes', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockResolvedValue(event);
    vi.mocked(areEventGuests).mockResolvedValue(true);
  });

  it('require a signed-in user', async () => {
    const res = await request(appWith('/api/events', eventRouter, null)).get('/api/events/1/groups');
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('are 404 for an event the user cannot manage', async () => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const res = await request(app).get('/api/events/2/groups');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(listGroups).not.toHaveBeenCalled();
  });

  it('list the event’s groups', async () => {
    vi.mocked(listGroups).mockResolvedValue([group]);
    const res = await request(app).get('/api/events/1/groups');
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toEqual([group]);
    expect(listGroups).toHaveBeenCalledWith(1);
  });

  it('create a group with a fresh unguessable token and de-duplicated guests', async () => {
    vi.mocked(createGroup).mockResolvedValue(group);
    const res = await request(app)
      .post('/api/events/1/groups')
      .send({ name: '  Иванови ', guestIds: [1, 2, 2] });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(areEventGuests).toHaveBeenCalledWith(1, [1, 2]);
    const [eventId, name, token, guestIds] = vi.mocked(createGroup).mock.calls[0];
    expect([eventId, name, guestIds]).toEqual([1, 'Иванови', [1, 2]]);
    expect(token).toMatch(/^[\w-]{12}$/);
  });

  it.each([
    ['a missing name', { name: ' ', guestIds: [1] }],
    ['no guests', { name: 'Иванови', guestIds: [] }],
    ['guest ids that are not numbers', { name: 'Иванови', guestIds: ['1'] }],
    ['too many guests', { name: 'Иванови', guestIds: Array.from({ length: 51 }, (_v, i) => i + 1) }],
  ])('reject %s', async (_case, body) => {
    const res = await request(app).post('/api/events/1/groups').send(body);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('reject guests of another event', async () => {
    vi.mocked(areEventGuests).mockResolvedValue(false);
    const res = await request(app)
      .post('/api/events/1/groups')
      .send({ name: 'Иванови', guestIds: [99] });
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body.error).toBe('guest not found');
  });

  it('update a group', async () => {
    vi.mocked(updateGroup).mockResolvedValue({ ...group, name: 'Семейство Иванови', guestIds: [1] });
    const res = await request(app)
      .put('/api/events/1/groups/10')
      .send({ name: 'Семейство Иванови', guestIds: [1] });
    expect(res.status).toBe(HttpStatus.OK);
    expect(updateGroup).toHaveBeenCalledWith(1, 10, 'Семейство Иванови', [1]);
    expect(res.body.name).toBe('Семейство Иванови');
  });

  it('are 404 when updating a group of another event', async () => {
    vi.mocked(updateGroup).mockResolvedValue(undefined);
    const res = await request(app)
      .put('/api/events/1/groups/77')
      .send({ name: 'Иванови', guestIds: [1] });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('delete a group', async () => {
    vi.mocked(deleteGroup).mockResolvedValue(true);
    const res = await request(app).delete('/api/events/1/groups/10');
    expect(res.status).toBe(HttpStatus.NO_CONTENT);
    expect(deleteGroup).toHaveBeenCalledWith(1, 10);
  });

  it('are 404 when deleting an unknown group', async () => {
    vi.mocked(deleteGroup).mockResolvedValue(false);
    const res = await request(app).delete('/api/events/1/groups/abc');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(deleteGroup).not.toHaveBeenCalled();
  });
});
