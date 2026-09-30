import crypto from 'node:crypto';
import { Router } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { MAX_COLORS } from '../shared/types.js';
import { requireUser } from './auth.js';
import { createForm, createFormResponse, getForm, getFormImage, getImageFile, listForms } from './db.js';

const MAX_NAME_LENGTH = 100;
const MAX_PLACE_LENGTH = 200;

export const formRouter = Router();

formRouter.get('/', requireUser, async (req, res) => {
  res.json(await listForms(req.user!.id));
});

// Publishing needs a signed-in builder; viewing and answering a form is public by slug.
formRouter.post('/', requireUser, async (req, res) => {
  const { imageId, showName, showAnswer } = req.body ?? {};
  const brideName = typeof req.body?.brideName === 'string' ? req.body.brideName.trim() : '';
  const groomName = typeof req.body?.groomName === 'string' ? req.body.groomName.trim() : '';
  if (typeof showName !== 'boolean' || typeof showAnswer !== 'boolean' || (!showName && !showAnswer)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'enable at least one form component' });
    return;
  }
  if (!brideName || !groomName || brideName.length > MAX_NAME_LENGTH || groomName.length > MAX_NAME_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `names must be 1-${MAX_NAME_LENGTH} characters` });
    return;
  }
  const weddingDate = typeof req.body?.weddingDate === 'string' ? req.body.weddingDate : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'weddingDate must be YYYY-MM-DD' });
    return;
  }
  const place = typeof req.body?.place === 'string' ? req.body.place.trim() : '';
  if (!place || place.length > MAX_PLACE_LENGTH) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `place must be 1-${MAX_PLACE_LENGTH} characters` });
    return;
  }
  const colors: unknown = req.body?.colors;
  if (
    !Array.isArray(colors) ||
    colors.length === 0 ||
    colors.length > MAX_COLORS ||
    !colors.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))
  ) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `colors must be 1-${MAX_COLORS} #rrggbb values` });
    return;
  }
  if (imageId !== null &&!(Number.isInteger(imageId) && (await getImageFile(req.user!.id, imageId)))) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'image not found' });
    return;
  }
  const slug = crypto.randomBytes(9).toString('base64url');
  res.status(HttpStatus.CREATED).json(
    await createForm(req.user!.id, slug, imageId, { showName, showAnswer }, {
      brideName,
      groomName,
      weddingDate,
      place,
      colors: colors as string[],
    }),
  );
});

formRouter.get('/:slug', async (req, res) => {
  const found = await getForm(req.params.slug);
  if (!found) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'form not found' });
    return;
  }
  res.json(found.form);
});

formRouter.get('/:slug/image', async (req, res) => {
  const file = await getFormImage(req.params.slug);
  if (!file) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'image not found' });
    return;
  }
  res.set({ 'Content-Type': file.mimeType, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(file.data);
});

formRouter.post('/:slug/responses', async (req, res) => {
  const found = await getForm(req.params.slug);
  if (!found) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'form not found' });
    return;
  }
  const { form } = found;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const answer: unknown = req.body?.answer;
  if (form.showName && (!name || name.length > MAX_NAME_LENGTH)) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: `name must be 1-${MAX_NAME_LENGTH} characters` });
    return;
  }
  if (form.showAnswer && typeof answer !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'please answer yes or no' });
    return;
  }
  await createFormResponse(found.id, form.showName ? name : null, form.showAnswer ? (answer as boolean) : null);
  res.status(HttpStatus.NO_CONTENT).end();
});
