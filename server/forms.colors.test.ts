import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import type { EventInfo, PublishedForm } from '../shared/types.js';
import { createForm, getEvent } from './db.js';
import { formRouter } from './forms.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  createForm: vi.fn(),
  getEvent: vi.fn(),
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
  colors: ['#111111', '#222222', '#333333'],
  primaryColor: 2,
  secondaryColor: 0,
  invitationText: '',
};

const app = appWith('/api/forms', formRouter);

beforeEach(() => {
  vi.mocked(getEvent).mockResolvedValue(event);
  vi.mocked(createForm).mockImplementation(async (_userId, _eventId, slug, imageId, fields, details) => ({
    slug,
    imageId,
    imageUrl: null,
    ...fields,
    ...details,
  }) satisfies PublishedForm);
});

describe('invitation colour marks', () => {
  it('saves which colours are primary and secondary', async () => {
    const res = await request(app).post('/api/forms').send(body);
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(createForm).toHaveBeenCalledWith(
      1,
      1,
      expect.any(String),
      null,
      { showName: true, showAnswer: true },
      expect.objectContaining({ colors: body.colors, primaryColor: 2, secondaryColor: 0 }),
    );
    expect(res.body).toMatchObject({ primaryColor: 2, secondaryColor: 0 });
  });

  it('lets a single colour be both primary and secondary', async () => {
    const res = await request(app)
      .post('/api/forms')
      .send({ ...body, colors: ['#111111'], primaryColor: 0, secondaryColor: 0 });
    expect(res.status).toBe(HttpStatus.CREATED);
  });

  it.each([
    ['the same colour is marked twice', { primaryColor: 1, secondaryColor: 1 }],
    ['a mark points past the colours', { primaryColor: 3 }],
    ['a mark is negative', { secondaryColor: -1 }],
    ['a mark is not a whole number', { primaryColor: 0.5 }],
    ['a mark is missing', { secondaryColor: undefined }],
  ])('rejects the invitation when %s', async (_case, marks) => {
    const res = await request(app)
      .post('/api/forms')
      .send({ ...body, ...marks });
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body.error).toMatch(/primary/);
    expect(createForm).not.toHaveBeenCalled();
  });
});
