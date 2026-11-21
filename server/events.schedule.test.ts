import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, ScheduleItem } from '../shared/types.js';
import { createScheduleItem, deleteScheduleItem, getEvent, listScheduleItems, updateScheduleItem } from './db.js';
import { eventRouter } from './events.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  createScheduleItem: vi.fn(),
  deleteScheduleItem: vi.fn(),
  getEvent: vi.fn(),
  listScheduleItems: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  updateScheduleItem: vi.fn(),
}));

const event: EventInfo = {
  id: 1,
  name: 'Сватба',
  createdAt: '2026-11-01T10:00:00.000Z',
  guestCount: 0,
  invitation: null,
  // Co-owners manage the schedule too, so the tests use one.
  isOwner: false,
  ownerName: 'Ана',
};

const item: ScheduleItem = {
  id: 30,
  title: 'Церемония',
  startTime: '15:00',
  place: 'Градината на хотела',
  createdAt: '2026-11-01T10:00:00.000Z',
};
const body = { title: 'Церемония', startTime: '15:00', place: 'Градината на хотела' };

const app = appWith('/api/events', eventRouter);

beforeEach(() => {
  vi.mocked(getEvent).mockResolvedValue(event);
});

describe('schedule routes', () => {
  it('require a signed-in user', async () => {
    const res = await request(appWith('/api/events', eventRouter, null)).get('/api/events/1/schedule');
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('are 404 for an event the user cannot manage', async () => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const res = await request(app).get('/api/events/2/schedule');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(listScheduleItems).not.toHaveBeenCalled();
  });

  it('list the event’s schedule', async () => {
    vi.mocked(listScheduleItems).mockResolvedValue([item]);
    const res = await request(app).get('/api/events/1/schedule');
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toEqual([item]);
    expect(listScheduleItems).toHaveBeenCalledWith(1);
  });

  it('create a part with trimmed text', async () => {
    vi.mocked(createScheduleItem).mockResolvedValue(item);
    const res = await request(app)
      .post('/api/events/1/schedule')
      .send({ ...body, title: ' Церемония ', place: ' Градината на хотела ' });
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createScheduleItem).toHaveBeenCalledWith(1, body);
  });

  it.each([
    ['a missing title', { ...body, title: '' }],
    ['a too long title', { ...body, title: 'x'.repeat(101) }],
    ['a missing start time', { ...body, startTime: undefined }],
    ['an invalid hour', { ...body, startTime: '24:00' }],
    ['a time without leading zero', { ...body, startTime: '9:30' }],
    ['a blank place', { ...body, place: '  ' }],
    ['a too long place', { ...body, place: 'x'.repeat(201) }],
  ])('reject %s', async (_case, invalid) => {
    const res = await request(app).post('/api/events/1/schedule').send(invalid);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createScheduleItem).not.toHaveBeenCalled();
  });

  it('update a part', async () => {
    vi.mocked(updateScheduleItem).mockResolvedValue({ ...item, startTime: '16:30' });
    const res = await request(app)
      .put('/api/events/1/schedule/30')
      .send({ ...body, startTime: '16:30' });
    expect(res.status).toBe(HttpStatus.OK);
    expect(updateScheduleItem).toHaveBeenCalledWith(1, 30, { ...body, startTime: '16:30' });
  });

  it('are 404 when updating a part of another event', async () => {
    vi.mocked(updateScheduleItem).mockResolvedValue(undefined);
    const res = await request(app).put('/api/events/1/schedule/77').send(body);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('delete a part', async () => {
    vi.mocked(deleteScheduleItem).mockResolvedValue(true);
    const res = await request(app).delete('/api/events/1/schedule/30');
    expect(res.status).toBe(HttpStatus.NO_CONTENT);
    expect(deleteScheduleItem).toHaveBeenCalledWith(1, 30);
  });

  it('are 404 when deleting an unknown part', async () => {
    vi.mocked(deleteScheduleItem).mockResolvedValue(false);
    const res = await request(app).delete('/api/events/1/schedule/abc');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(deleteScheduleItem).not.toHaveBeenCalled();
  });
});
