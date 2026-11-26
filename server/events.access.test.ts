import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import { getEvent } from './db.js';
import { eventRouter } from './events.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  getEvent: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

// Every route of the event page, with the body a valid request would carry.
const routes = [
  ['get', '/1'],
  ['delete', '/1'],
  ['get', '/1/coowners'],
  ['post', '/1/coowners'],
  ['delete', '/1/coowners/2'],
  ['get', '/1/guests'],
  ['post', '/1/guests'],
  ['patch', '/1/guests/2'],
  ['delete', '/1/guests/2'],
  ['get', '/1/responses'],
  ['put', '/1/guests/2/response'],
  ['get', '/1/groups'],
  ['post', '/1/groups'],
  ['put', '/1/groups/2'],
  ['delete', '/1/groups/2'],
  ['get', '/1/menus'],
  ['post', '/1/menus'],
  ['put', '/1/menus/2'],
  ['delete', '/1/menus/2'],
  ['get', '/1/schedule'],
  ['post', '/1/schedule'],
  ['put', '/1/schedule/2'],
  ['delete', '/1/schedule/2'],
] as const;

describe('the event page API is only for the event’s owners', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockReset();
  });

  it.each(routes)('%s %s needs a signed-in user', async (method, path) => {
    const res = await request(appWith('/', eventRouter, null))[method](path).send({});
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(getEvent).not.toHaveBeenCalled();
  });

  it.each(routes)('%s %s is not found for someone who neither owns nor co-owns the event', async (method, path) => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const res = await request(appWith('/', eventRouter))[method](path).send({});
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});
