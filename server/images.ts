import { Router } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { requireUser } from './auth.js';
import { createImage, deleteImage, getImageFile, listImages } from './db.js';

const MAX_PROMPT_LENGTH = 500;
const GENERATION_TIMEOUT_MS = 60_000;

const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfToken = process.env.CLOUDFLARE_API_TOKEN;
const cfModel = process.env.CLOUDFLARE_IMAGE_MODEL ?? '@cf/black-forest-labs/flux-1-schnell';
if (!cfAccountId || !cfToken) {
  console.warn('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set; image generation will not work.');
}

interface WorkersAiResponse {
  success?: boolean;
  errors?: unknown[];
  result?: { image?: string };
}

export const imageRouter = Router();

imageRouter.use(requireUser);

imageRouter.get('/', async (req, res) => {
  res.json(await listImages(req.user!.id));
});

imageRouter.post('/', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!cfAccountId || !cfToken) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'image generation is not configured' });
    return;
  }
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `prompt must be 1-${MAX_PROMPT_LENGTH} characters` });
    return;
  }

  let data;
  try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${cfModel}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });
    const body = (await upstream.json()) as WorkersAiResponse;
    if (!upstream.ok || !body.success || !body.result?.image) {
      console.error(`Workers AI responded with ${upstream.status}:`, body.errors);
      throw new Error('image generation failed');
    }
    data = Buffer.from(body.result.image, 'base64');
  } catch {
    res.status(HttpStatus.BAD_GATEWAY).json({ error: 'image generation failed, please try again' });
    return;
  }

  // FLUX.1-schnell on Workers AI always returns a base64 JPEG.
  res.status(HttpStatus.CREATED).json(await createImage(req.user!.id, prompt, 'image/jpeg', data));
});

imageRouter.get('/:id/file', async (req, res) => {
  const id = Number(req.params.id);
  const file = Number.isInteger(id) ? await getImageFile(req.user!.id, id) : undefined;
  if (!file) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'image not found' });
    return;
  }
  res.set({ 'Content-Type': file.mimeType, 'Cache-Control': 'private, max-age=31536000, immutable' });
  res.send(file.data);
});

imageRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await deleteImage(req.user!.id, id))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'image not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});
