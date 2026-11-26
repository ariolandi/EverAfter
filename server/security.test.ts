import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { HttpStatus } from '../shared/httpStatus.js';
import { rateLimit, securityHeaders } from './security.js';

describe('securityHeaders', () => {
  it('forbids sniffing and framing', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/', (_req, res) => void res.json({}));
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});

describe('rateLimit', () => {
  it('answers 429 once a client goes over the limit', async () => {
    const app = express();
    app.use(rateLimit(2, 60_000));
    app.get('/', (_req, res) => void res.json({}));
    expect((await request(app).get('/')).status).toBe(HttpStatus.OK);
    expect((await request(app).get('/')).status).toBe(HttpStatus.OK);
    const res = await request(app).get('/');
    expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
