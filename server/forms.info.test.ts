import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, PublishedForm } from '../shared/types.js';
import { createForm, getEvent, getForm, listMenus, listScheduleItems } from './db.js';
import { formRouter } from './forms.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  createForm: vi.fn(),
  getEvent: vi.fn(),
  getForm: vi.fn(),
  listMenus: vi.fn(),
  listScheduleItems: vi.fn(),
}));

const event: EventInfo = {
  id: 1,
  name: 'Сватба',
  createdAt: '2026-11-01T10:00:00.000Z',
  guestCount: 0,
  invitation: null,
  isOwner: true,
  ownerName: 'Мария',
};

const body = {
  eventId: 1,
  imageId: null,
  showName: true,
  showAnswer: true,
  brideName: 'Мария',
  groomName: 'Иван',
  weddingDate: '2027-06-12',
  place: 'Пловдив',
  colors: ['#111111', '#222222'],
  primaryColor: 0,
  secondaryColor: 1,
  invitationText: '',
  accommodationNotes: '',
  transportNotes: '',
  dressCode: 'formal',
  colorUsage: 'mandatory',
};

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
  colors: ['#111111', '#222222'],
  primaryColor: 0,
  secondaryColor: 1,
  invitationText: '',
  accommodationNotes: '',
  transportNotes: '',
  dressCode: 'formal',
  colorUsage: 'mandatory',
};

const app = appWith('/api/forms', formRouter);

beforeEach(() => {
  vi.mocked(getEvent).mockResolvedValue(event);
  vi.mocked(createForm).mockResolvedValue(form);
});

describe('invitation dress code and colour usage', () => {
  it('saves the dress code and whether the colours are mandatory', async () => {
    const res = await request(app).post('/api/forms').send(body);
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createForm).toHaveBeenCalledWith(
      1,
      1,
      expect.any(String),
      null,
      { showName: true, showAnswer: true },
      expect.objectContaining({ dressCode: 'formal', colorUsage: 'mandatory' }),
    );
  });

  it.each([
    ['a missing dress code', { ...body, dressCode: undefined }],
    ['an unknown dress code', { ...body, dressCode: 'casual' }],
    ['a missing colour usage', { ...body, colorUsage: undefined }],
    ['an unknown colour usage', { ...body, colorUsage: 'required' }],
  ])('rejects %s', async (_case, invalid) => {
    const res = await request(app).post('/api/forms').send(invalid);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createForm).not.toHaveBeenCalled();
  });
});

describe('GET /api/forms/:slug', () => {
  it('includes the event’s schedule and menus for the invitation’s pages', async () => {
    const schedule = [
      { id: 30, title: 'Церемония', startTime: '15:00', place: 'Градината', createdAt: '2026-11-01T10:00:00.000Z' },
    ];
    vi.mocked(getForm).mockResolvedValue({ id: 5, eventId: 1, form });
    vi.mocked(listScheduleItems).mockResolvedValue(schedule);
    const menus = [
      {
        id: 20,
        name: 'Меню',
        isChild: false,
        salad: 'А',
        appetizer: 'Б',
        mainCourse: 'В',
        createdAt: '2026-11-01T10:00:00.000Z',
      },
    ];
    vi.mocked(listMenus).mockResolvedValue(menus);
    const res = await request(app).get('/api/forms/abc123');
    expect(res.status).toBe(HttpStatus.OK);
    expect(listScheduleItems).toHaveBeenCalledWith(1);
    expect(res.body).toEqual({ ...form, schedule, menus });
  });
});
