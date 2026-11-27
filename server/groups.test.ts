import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { GuestResponse, InvitedGuest, Menu, PublishedForm } from '../shared/types.js';
import { createGuestResponses, getGroupInvitation, getGuestInvitation, type InvitationRecord } from './db.js';
import { groupRouter, guestRouter } from './groups.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  getGroupInvitation: vi.fn(),
  getGuestInvitation: vi.fn(),
  createGuestResponses: vi.fn(),
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

const menu: Menu = {
  id: 20,
  name: 'Класическо меню',
  isChild: false,
  salad: 'Шопска салата',
  appetizer: 'Пълнени чушки',
  mainCourse: 'Свинско',
  createdAt: '2026-11-01T10:00:00.000Z',
};

const schedule = [
  { id: 30, title: 'Церемония', startTime: '15:00', place: 'Градината', createdAt: '2026-11-01T10:00:00.000Z' },
];

const recorded: GuestResponse = {
  respondedAt: '2026-11-19T10:00:00.000Z',
  answer: true,
  menuId: null,
  accommodation: true,
  transport: 'own',
};

const guest = (id: number, name: string, isChild = false, response: GuestResponse | null = null): InvitedGuest => ({
  id,
  name,
  isChild,
  response,
});

const record = (overrides: Partial<InvitationRecord> = {}): InvitationRecord => ({
  groupId: 10,
  eventName: 'Сватба',
  name: 'Семейство Иванови',
  guests: [guest(1, 'Иван Иванов'), guest(2, 'Мария Иванова')],
  menus: [],
  form: { id: 5, form },
  schedule,
  ...overrides,
});

// Personal links are public: no one is signed in.
const groupApp = appWith('/api/groups', groupRouter, null);
const guestApp = appWith('/api/guests', guestRouter, null);

beforeEach(() => {
  vi.mocked(createGuestResponses).mockResolvedValue(true);
});

describe('GET /api/groups/:token', () => {
  it('returns the invitation and the group’s guests, none answered yet', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    const res = await request(groupApp).get('/api/groups/grp-token');

    expect(res.status).toBe(HttpStatus.OK);
    expect(getGroupInvitation).toHaveBeenCalledWith('grp-token');
    expect(res.body).toEqual({
      form,
      eventName: 'Сватба',
      schedule,
      groupName: 'Семейство Иванови',
      guests: record().guests,
      menus: [],
    });
  });

  it('includes each guest’s answer once they have answered', async () => {
    const guests = [guest(1, 'Иван Иванов', false, recorded), guest(2, 'Мария Иванова')];
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ guests }));
    const res = await request(groupApp).get('/api/groups/grp-token');
    expect(res.body.guests).toEqual(guests);
  });

  it('is 404 for an unknown token', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(undefined);
    const res = await request(groupApp).get('/api/groups/missing');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('is 404 while the event has no invitation', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: null }));
    const res = await request(groupApp).get('/api/groups/grp-token');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error).toBe('the invitation has not been published yet');
  });
});

describe('GET /api/guests/:token', () => {
  it('returns the invitation addressed to the one guest', async () => {
    const own = record({ groupId: null, name: 'Иван Иванов', guests: [guest(1, 'Иван Иванов')] });
    vi.mocked(getGuestInvitation).mockResolvedValue(own);
    const res = await request(guestApp).get('/api/guests/guest-token');

    expect(res.status).toBe(HttpStatus.OK);
    expect(getGuestInvitation).toHaveBeenCalledWith('guest-token');
    expect(res.body.groupName).toBe('Иван Иванов');
    expect(res.body.guests).toEqual(own.guests);
  });

  it('is 404 for an unknown token', async () => {
    vi.mocked(getGuestInvitation).mockResolvedValue(undefined);
    const res = await request(guestApp).get('/api/guests/missing');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});

describe('POST /api/groups/:token/responses', () => {
  const post = (body: unknown) =>
    request(groupApp)
      .post('/api/groups/grp-token/responses')
      .send(body as object);
  const coming = (guestId: number, extra: object = {}) => ({
    guestId,
    answer: true,
    accommodation: true,
    transport: 'own',
    ...extra,
  });

  it('records one answer per guest with their current names, and returns the updated invitation', async () => {
    const after = record({ guests: [guest(1, 'Иван Иванов', false, recorded), guest(2, 'Мария Иванова', false, recorded)] });
    vi.mocked(getGroupInvitation).mockResolvedValueOnce(record()).mockResolvedValueOnce(after);
    const res = await post({ answers: [{ guestId: 2, answer: false }, coming(1)] });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body.guests).toEqual(after.guests);
    expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
      { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: true, transport: 'own' },
      { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null, roomWith: null, notes: null },
    ]);
  });

  it('records no yes/no when the invitation does not ask for it, treating every guest as coming', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: { id: 5, form: { ...form, showAnswer: false } } }));
    const res = await post({
      answers: [
        { guestId: 1, accommodation: false, transport: 'needsHelp' },
        { guestId: 2, accommodation: true, transport: 'own' },
      ],
    });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
      { guestId: 1, name: 'Иван Иванов', answer: null, menuId: null, accommodation: false, transport: 'needsHelp' },
      { guestId: 2, name: 'Мария Иванова', answer: null, menuId: null, accommodation: true, transport: 'own' },
    ]);
  });

  it.each([
    ['no answers', {}],
    ['a guest left out', { answers: [coming(1)] }],
    ['a guest answered twice', { answers: [coming(1), { guestId: 1, answer: false }] }],
    ['a guest from outside the group', { answers: [coming(1), coming(3)] }],
    ['no yes or no for a guest', { answers: [coming(1), { guestId: 2, accommodation: true, transport: 'own' }] }],
  ])('rejects %s', async (_label, body) => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    const res = await post(body);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createGuestResponses).not.toHaveBeenCalled();
  });

  it('rejects an answer for a group with no guests', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ guests: [] }));
    const res = await post({ answers: [] });
    expect(res.status).toBe(HttpStatus.CONFLICT);
    expect(createGuestResponses).not.toHaveBeenCalled();
  });

  it('refuses an answer once every guest has answered', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(
      record({ guests: [guest(1, 'Иван Иванов', false, recorded), guest(2, 'Мария Иванова', false, recorded)] }),
    );
    const res = await post({ answers: [coming(1), coming(2)] });
    expect(res.status).toBe(HttpStatus.CONFLICT);
    expect(createGuestResponses).not.toHaveBeenCalled();
  });

  it('takes answers only for the guests who have not answered yet', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(
      record({ guests: [guest(1, 'Иван Иванов', false, recorded), guest(2, 'Мария Иванова')] }),
    );
    // Ivan answered from his own link, so only Maria is expected.
    expect((await post({ answers: [coming(1), coming(2)] })).status).toBe(HttpStatus.BAD_REQUEST);
    const res = await post({ answers: [coming(2)] });
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
      { guestId: 2, name: 'Мария Иванова', answer: true, menuId: null, accommodation: true, transport: 'own' },
    ]);
  });

  it('refuses an answer that lost a race with another one', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    vi.mocked(createGuestResponses).mockResolvedValue(false);
    const res = await post({ answers: [coming(1), coming(2)] });
    expect(res.status).toBe(HttpStatus.CONFLICT);
  });

  it('is 404 when there is no invitation to answer', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: null }));
    const res = await post({ answers: [] });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  describe('accommodation and transport', () => {
    const answerFor = (extra: object) => ({ answers: [coming(1, extra), { guestId: 2, answer: false }] });

    it('records them for guests who come and none for those who do not', async () => {
      vi.mocked(getGroupInvitation).mockResolvedValue(record());
      const res = await post({
        answers: [
          coming(1, { accommodation: false, transport: 'arrangesOwn' }),
          // Anything sent for a guest who does not come is ignored.
          { guestId: 2, answer: false, accommodation: true, transport: 'needsHelp' },
        ],
      });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: false, transport: 'arrangesOwn' },
        { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null, roomWith: null, notes: null },
      ]);
    });

    it.each([
      ['no accommodation answer', { accommodation: undefined }],
      ['an accommodation answer that is not yes or no', { accommodation: 'yes' }],
      ['no transport answer', { transport: undefined }],
      ['an unknown transport', { transport: 'helicopter' }],
    ])('refuses a guest who comes with %s', async (_label, extra) => {
      vi.mocked(getGroupInvitation).mockResolvedValue(record());
      const res = await post(answerFor(extra));
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(createGuestResponses).not.toHaveBeenCalled();
    });
  });

  describe('menus', () => {
    const adultMenu = { ...menu, id: 20, isChild: false };
    const kidsMenu = { ...menu, id: 21, name: 'Детско меню', isChild: true };
    const withMenus = () =>
      vi
        .mocked(getGroupInvitation)
        .mockResolvedValue(
          record({ guests: [guest(1, 'Иван Иванов'), guest(2, 'Ники Иванов', true)], menus: [adultMenu, kidsMenu] }),
        );

    it('records each attending guest’s menu', async () => {
      withMenus();
      const res = await post({ answers: [coming(1, { menuId: 20 }), coming(2, { menuId: 21 })] });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: 20, accommodation: true, transport: 'own' },
        { guestId: 2, name: 'Ники Иванов', answer: true, menuId: 21, accommodation: true, transport: 'own' },
      ]);
    });

    it('lets a child pick an adults’ menu', async () => {
      withMenus();
      const res = await post({ answers: [coming(1, { menuId: 20 }), coming(2, { menuId: 20 })] });
      expect(res.status).toBe(HttpStatus.CREATED);
    });

    it('refuses the children’s menu for an adult', async () => {
      withMenus();
      const res = await post({ answers: [coming(1, { menuId: 21 }), coming(2, { menuId: 21 })] });
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(createGuestResponses).not.toHaveBeenCalled();
    });

    it.each([
      ['no menu', undefined],
      ['an unknown menu', 999],
    ])('refuses an attending guest with %s', async (_label, menuId) => {
      withMenus();
      const res = await post({ answers: [coming(1, { menuId }), coming(2, { menuId: 21 })] });
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('records no menu for a guest who does not come', async () => {
      withMenus();
      const res = await post({ answers: [{ guestId: 1, answer: false, menuId: 21 }, coming(2, { menuId: 21 })] });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGuestResponses).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: false, menuId: null, accommodation: null, transport: null, roomWith: null, notes: null },
        { guestId: 2, name: 'Ники Иванов', answer: true, menuId: 21, accommodation: true, transport: 'own' },
      ]);
    });
  });
});

describe('POST /api/guests/:token/responses', () => {
  it('records the guest’s own answer, with no group', async () => {
    const own = record({ groupId: null, name: 'Иван Иванов', guests: [guest(1, 'Иван Иванов')] });
    vi.mocked(getGuestInvitation).mockResolvedValue(own);
    const res = await request(guestApp)
      .post('/api/guests/guest-token/responses')
      .send({ answers: [{ guestId: 1, answer: true, accommodation: false, transport: 'needsHelp' }] });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createGuestResponses).toHaveBeenCalledWith(5, null, [
      { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: false, transport: 'needsHelp' },
    ]);
  });

  it('records who a guest who stays the night would like to share a room with, and drops it otherwise', async () => {
    const own = record({ groupId: null, name: 'Иван Иванов', guests: [guest(1, 'Иван Иванов')] });
    vi.mocked(getGuestInvitation).mockResolvedValue(own);
    const send = (accommodation: boolean) =>
      request(guestApp)
        .post('/api/guests/guest-token/responses')
        .send({ answers: [{ guestId: 1, answer: true, accommodation, transport: 'own', roomWith: '  Петър  ' }] });

    await send(true);
    expect(createGuestResponses).toHaveBeenLastCalledWith(5, null, [expect.objectContaining({ roomWith: 'Петър' })]);
    await send(false);
    expect(createGuestResponses).toHaveBeenLastCalledWith(5, null, [expect.objectContaining({ roomWith: null })]);
  });

  it('refuses a second answer from the same link', async () => {
    vi.mocked(getGuestInvitation).mockResolvedValue(
      record({ groupId: null, guests: [guest(1, 'Иван Иванов', false, recorded)] }),
    );
    const res = await request(guestApp)
      .post('/api/guests/guest-token/responses')
      .send({ answers: [{ guestId: 1, answer: false }] });
    expect(res.status).toBe(HttpStatus.CONFLICT);
    expect(createGuestResponses).not.toHaveBeenCalled();
  });
});
