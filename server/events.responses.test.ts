import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, Guest, Menu, PublishedForm } from '../shared/types.js';
import { getEvent, listGuests, listMenus, listResponses, saveGuestResponse } from './db.js';
import { eventRouter } from './events.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  getEvent: vi.fn(),
  listGuests: vi.fn(),
  listMenus: vi.fn(),
  listResponses: vi.fn(),
  saveGuestResponse: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

const form: PublishedForm = {
  slug: 'abc123',
  imageId: null,
  imageUrl: null,
  showName: true,
  showAnswer: true,
  organizers: ['Мария', 'Иван'],
  weddingDate: '2027-06-12',
  place: 'Пловдив',
  colors: ['#6b6254', '#c9a227'],
  primaryColor: 0,
  secondaryColor: 1,
  invitationText: '',
  accommodationNotes: '',
  transportNotes: '',
  dressCode: 'cocktail',
  colorUsage: 'informative',
};

const event = (invitation: PublishedForm | null = form): EventInfo => ({
  id: 1,
  name: 'Сватба',
  createdAt: '2026-11-01T10:00:00.000Z',
  guestCount: 2,
  invitation,
  // Co-owners see and edit the answers too, so the tests use one.
  isOwner: false,
  ownerName: 'Ана',
});

const guest = (id: number, name: string, isChild = false): Guest => ({
  id,
  name,
  groupId: null,
  token: `token-${id}`,
  isChild,
  createdAt: '2026-11-01T10:00:00.000Z',
});

const adultMenu: Menu = {
  id: 20,
  name: 'Класическо меню',
  isChild: false,
  salad: 'А',
  appetizer: 'Б',
  mainCourse: 'В',
  createdAt: '2026-11-01T10:00:00.000Z',
};
const kidsMenu: Menu = { ...adultMenu, id: 21, name: 'Детско меню', isChild: true };

const app = appWith('/api/events', eventRouter);

beforeEach(() => {
  vi.mocked(getEvent).mockResolvedValue(event());
  vi.mocked(listGuests).mockResolvedValue([guest(1, 'Иван Иванов'), guest(2, 'Ники Иванов', true)]);
  vi.mocked(listMenus).mockResolvedValue([adultMenu, kidsMenu]);
  vi.mocked(saveGuestResponse).mockResolvedValue(true);
});

describe('GET /api/events/:id/responses', () => {
  it('lists every guest’s answer for the organizers', async () => {
    const entries = [
      { guestId: 1, generalResponseId: null, name: 'Иван Иванов', groupName: null, response: null },
      { guestId: null, generalResponseId: 5, name: 'Петър', groupName: null, response: null },
    ];
    vi.mocked(listResponses).mockResolvedValue(entries);
    const res = await request(app).get('/api/events/1/responses');
    expect(res.status).toBe(HttpStatus.OK);
    expect(listResponses).toHaveBeenCalledWith(1);
    expect(res.body).toEqual(entries);
  });

  it('is 404 for an event the user cannot manage', async () => {
    vi.mocked(getEvent).mockResolvedValue(undefined);
    const res = await request(app).get('/api/events/1/responses');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});

describe('PUT /api/events/:id/guests/:guestId/response', () => {
  const put = (guestId: number, body: unknown) =>
    request(app)
      .put(`/api/events/1/guests/${guestId}/response`)
      .send(body as object);

  it('records an answer as complete as one a guest sends', async () => {
    const res = await put(1, { answer: true, menuId: 20, accommodation: false, transport: 'needsHelp' });
    expect(res.status).toBe(HttpStatus.NO_CONTENT);
    expect(saveGuestResponse).toHaveBeenCalledWith(1, 1, {
      answer: true,
      menuId: 20,
      accommodation: false,
      transport: 'needsHelp',
    });
  });

  it('keeps nothing but the “no” for a guest who does not come', async () => {
    const res = await put(1, { answer: false, menuId: 20, accommodation: true, transport: 'own' });
    expect(res.status).toBe(HttpStatus.NO_CONTENT);
    expect(saveGuestResponse).toHaveBeenCalledWith(1, 1, {
      answer: false,
      menuId: null,
      accommodation: null,
      transport: null,
      roomWith: null,
    });
  });

  it('lets a child have the children’s menu but not an adult have it', async () => {
    const own = { answer: true, accommodation: true, transport: 'own' };
    expect((await put(2, { ...own, menuId: 21 })).status).toBe(HttpStatus.NO_CONTENT);
    expect((await put(1, { ...own, menuId: 21 })).status).toBe(HttpStatus.BAD_REQUEST);
  });

  it.each([
    ['no yes or no', { menuId: 20, accommodation: true, transport: 'own' }],
    ['no menu', { answer: true, accommodation: true, transport: 'own' }],
    ['no accommodation', { answer: true, menuId: 20, transport: 'own' }],
    ['no transport', { answer: true, menuId: 20, accommodation: true }],
  ])('rejects an answer with %s', async (_label, body) => {
    const res = await put(1, body);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(saveGuestResponse).not.toHaveBeenCalled();
  });

  it('is 404 for a guest who is not on the list', async () => {
    const res = await put(99, { answer: false });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(saveGuestResponse).not.toHaveBeenCalled();
  });

  it('is 409 while the event has no invitation to answer', async () => {
    vi.mocked(getEvent).mockResolvedValue(event(null));
    const res = await put(1, { answer: false });
    expect(res.status).toBe(HttpStatus.CONFLICT);
  });
});
