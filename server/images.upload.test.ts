import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import { MAX_UPLOAD_BYTES } from '../shared/types.js';
import { createImage } from './db.js';
import { imageRouter } from './images.js';
import { appWith } from './test/app.js';

vi.mock('./db.js', () => ({
  createImage: vi.fn(),
  deleteImage: vi.fn(),
  getImageFile: vi.fn(),
  listImages: vi.fn(),
}));

const app = appWith('/api/images', imageRouter);

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

beforeEach(() => {
  vi.mocked(createImage).mockImplementation(async (_userId, prompt) => ({
    id: 7,
    prompt,
    createdAt: '2026-11-01T10:00:00.000Z',
    url: '/api/images/7/file',
  }));
});

describe('picture upload', () => {
  it('stores an uploaded picture under its detected type', async () => {
    const res = await request(app)
      .post('/api/images/upload?name=church.png')
      .set('Content-Type', 'image/png')
      .send(png);
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body).toMatchObject({ id: 7, url: '/api/images/7/file' });
    expect(createImage).toHaveBeenCalledWith(1, 'church.png', 'image/png', png);
  });

  it('rejects a file whose bytes are not a supported picture, whatever it claims to be', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('<svg onload="alert(1)"/>'));
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(createImage).not.toHaveBeenCalled();
  });

  it('rejects an upload that is not an image type', async () => {
    const res = await request(app).post('/api/images/upload').set('Content-Type', 'application/octet-stream').send(png);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('rejects a picture over the size limit', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .set('Content-Type', 'image/png')
      .send(Buffer.concat([png, Buffer.alloc(MAX_UPLOAD_BYTES)]));
    expect(res.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(createImage).not.toHaveBeenCalled();
  });
});
