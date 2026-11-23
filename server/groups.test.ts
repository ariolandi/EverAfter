import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { GroupResponse, Menu, PublishedForm } from '../shared/types.js';
import { createGroupResponse, getGroupInvitation, type GroupInvitationRecord } from './db.js';
import { groupRouter } from './groups.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({ getGroupInvitation: vi.fn(), createGroupResponse: vi.fn() }));

const form: PublishedForm = {
  slug: 'abc123',
  imageId: null,
  imageUrl: null,
  showName: true,
  showAnswer: true,
  brideName: 'Мария',
  groomName: 'Иван',
  weddingDate: '2027-06-12',
  place: 'Пловдив',
  colors: ['#6b6254', '#c9a227'],
  primaryColor: 0,
  secondaryColor: 1,
  invitationText: '',
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

const record = (overrides: Partial<GroupInvitationRecord> = {}): GroupInvitationRecord => ({
  groupId: 10,
  groupName: 'Семейство Иванови',
  guests: [
    { id: 1, name: 'Иван Иванов', isChild: false },
    { id: 2, name: 'Мария Иванова', isChild: false },
  ],
  menus: [],
  form: { id: 5, form },
  schedule,
  response: null,
  ...overrides,
});

const answered: GroupResponse = {
  respondedAt: '2026-11-19T10:00:00.000Z',
  guests: [
    { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: true, transport: 'own' },
    { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null },
  ],
};

// Group links are public: no one is signed in.
const app = appWith('/api/groups', groupRouter, null);

describe('GET /api/groups/:token', () => {
  it('returns the invitation, the group’s guests and no answer yet', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    const res = await request(app).get('/api/groups/grp-token');

    expect(res.status).toBe(HttpStatus.OK);
    expect(getGroupInvitation).toHaveBeenCalledWith('grp-token');
    expect(res.body).toEqual({
      form,
      schedule,
      groupName: 'Семейство Иванови',
      guests: record().guests,
      menus: [],
      response: null,
    });
  });

  it('includes the answer once the group has answered', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ response: answered }));
    const res = await request(app).get('/api/groups/grp-token');
    expect(res.body.response).toEqual(answered);
  });

  it('is 404 for an unknown token', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(undefined);
    const res = await request(app).get('/api/groups/missing');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('is 404 while the event has no invitation', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: null }));
    const res = await request(app).get('/api/groups/grp-token');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error).toBe('the invitation has not been published yet');
  });
});

describe('POST /api/groups/:token/responses', () => {
  const post = (body: unknown) =>
    request(app)
      .post('/api/groups/grp-token/responses')
      .send(body as object);

  it('records one answer per guest with their current names', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    vi.mocked(createGroupResponse).mockResolvedValue(answered);
    const res = await post({
      answers: [
        { guestId: 2, answer: false },
        { guestId: 1, answer: true, accommodation: true, transport: 'own' },
      ],
    });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body).toEqual(answered);
    expect(createGroupResponse).toHaveBeenCalledWith(5, 10, [
      { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: true, transport: 'own' },
      { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null },
    ]);
  });

  it('records no yes/no when the invitation does not ask for it', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: { id: 5, form: { ...form, showAnswer: false } } }));
    vi.mocked(createGroupResponse).mockResolvedValue(answered);
    const res = await post({
      answers: [
        { guestId: 1, accommodation: false, transport: 'needsHelp' },
        { guestId: 2, answer: true, accommodation: true, transport: 'own' },
      ],
    });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createGroupResponse).toHaveBeenCalledWith(5, 10, [
      { guestId: 1, name: 'Иван Иванов', answer: null, menuId: null, accommodation: false, transport: 'needsHelp' },
      { guestId: 2, name: 'Мария Иванова', answer: null, menuId: null, accommodation: true, transport: 'own' },
    ]);
  });

  it.each([
    ['no answers', {}],
    ['a guest left out', { answers: [{ guestId: 1, answer: true, accommodation: true, transport: 'own' }] }],
    [
      'a guest answered twice',
      {
        answers: [
          { guestId: 1, answer: true, accommodation: true, transport: 'own' },
          { guestId: 1, answer: false },
        ],
      },
    ],
    [
      'a guest from outside the group',
      {
        answers: [
          { guestId: 1, answer: true, accommodation: true, transport: 'own' },
          { guestId: 3, answer: true, accommodation: true, transport: 'own' },
        ],
      },
    ],
    [
      'a missing yes/no',
      {
        answers: [{ guestId: 1, answer: true, accommodation: true, transport: 'own' }, { guestId: 2 }],
      },
    ],
  ])('rejects %s', async (_case, body) => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    const res = await post(body);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createGroupResponse).not.toHaveBeenCalled();
  });

  it('rejects an answer for a group with no guests', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ guests: [] }));
    const res = await post({ answers: [] });
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('refuses a second answer', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ response: answered }));
    const res = await post({
      answers: [
        { guestId: 1, answer: true, accommodation: true, transport: 'own' },
        { guestId: 2, answer: true, accommodation: true, transport: 'own' },
      ],
    });
    expect(res.status).toBe(HttpStatus.CONFLICT);
    expect(createGroupResponse).not.toHaveBeenCalled();
  });

  it('refuses an answer that lost a race with another one', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record());
    vi.mocked(createGroupResponse).mockResolvedValue(undefined);
    const res = await post({
      answers: [
        { guestId: 1, answer: true, accommodation: true, transport: 'own' },
        { guestId: 2, answer: true, accommodation: true, transport: 'own' },
      ],
    });
    expect(res.status).toBe(HttpStatus.CONFLICT);
  });

  describe('accommodation and transport', () => {
    const answerFor = (extra: object) => ({
      answers: [
        { guestId: 1, answer: true, accommodation: true, transport: 'own', ...extra },
        { guestId: 2, answer: false },
      ],
    });

    it('records them for guests who come and none for those who do not', async () => {
      vi.mocked(getGroupInvitation).mockResolvedValue(record());
      vi.mocked(createGroupResponse).mockResolvedValue(answered);
      const res = await post({
        answers: [
          { guestId: 1, answer: true, accommodation: false, transport: 'arrangesOwn' },
          // Anything sent for a guest who does not come is ignored.
          { guestId: 2, answer: false, accommodation: true, transport: 'needsHelp' },
        ],
      });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGroupResponse).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: false, transport: 'arrangesOwn' },
        { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null },
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
      expect(createGroupResponse).not.toHaveBeenCalled();
    });
  });

  describe('menus', () => {
    const adultMenu = { ...menu, id: 20, isChild: false };
    const kidsMenu = { ...menu, id: 21, name: 'Детско меню', isChild: true };
    const withMenus = () =>
      vi.mocked(getGroupInvitation).mockResolvedValue(
        record({
          guests: [
            { id: 1, name: 'Иван Иванов', isChild: false },
            { id: 2, name: 'Ники Иванов', isChild: true },
          ],
          menus: [adultMenu, kidsMenu],
        }),
      );

    it('records each attending guest’s menu', async () => {
      withMenus();
      vi.mocked(createGroupResponse).mockResolvedValue(answered);
      const res = await post({
        answers: [
          { guestId: 1, answer: true, menuId: 20, accommodation: true, transport: 'own' },
          { guestId: 2, answer: true, menuId: 21, accommodation: true, transport: 'own' },
        ],
      });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGroupResponse).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: 20, accommodation: true, transport: 'own' },
        { guestId: 2, name: 'Ники Иванов', answer: true, menuId: 21, accommodation: true, transport: 'own' },
      ]);
    });

    it('lets a child pick an adults’ menu', async () => {
      withMenus();
      vi.mocked(createGroupResponse).mockResolvedValue(answered);
      const res = await post({
        answers: [
          { guestId: 1, answer: true, menuId: 20, accommodation: true, transport: 'own' },
          { guestId: 2, answer: true, menuId: 20, accommodation: true, transport: 'own' },
        ],
      });
      expect(res.status).toBe(HttpStatus.CREATED);
    });

    it('refuses the children’s menu for an adult', async () => {
      withMenus();
      const res = await post({
        answers: [
          { guestId: 1, answer: true, menuId: 21, accommodation: true, transport: 'own' },
          { guestId: 2, answer: true, menuId: 21, accommodation: true, transport: 'own' },
        ],
      });
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(createGroupResponse).not.toHaveBeenCalled();
    });

    it.each([
      ['no menu', undefined],
      ['an unknown menu', 999],
    ])('refuses an attending guest with %s', async (_label, menuId) => {
      withMenus();
      const res = await post({
        answers: [
          { guestId: 1, answer: true, menuId, accommodation: true, transport: 'own' },
          { guestId: 2, answer: true, menuId: 21, accommodation: true, transport: 'own' },
        ],
      });
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('records no menu for a guest who does not come', async () => {
      withMenus();
      vi.mocked(createGroupResponse).mockResolvedValue(answered);
      const res = await post({
        answers: [
          { guestId: 1, answer: false, menuId: 21 },
          { guestId: 2, answer: true, menuId: 21, accommodation: true, transport: 'own' },
        ],
      });
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(createGroupResponse).toHaveBeenCalledWith(5, 10, [
        { guestId: 1, name: 'Иван Иванов', answer: false, menuId: null, accommodation: null, transport: null },
        { guestId: 2, name: 'Ники Иванов', answer: true, menuId: 21, accommodation: true, transport: 'own' },
      ]);
    });
  });

  it('is 404 when there is no invitation to answer', async () => {
    vi.mocked(getGroupInvitation).mockResolvedValue(record({ form: null }));
    const res = await post({ answers: [] });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});
