import './env.js';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { authRouter, loadUser, requireUser } from './auth.js';
import { createTask, deleteTask, listTasks, migrateDatabase, setTaskCompleted } from './db.js';
import { eventRouter } from './events.js';
import { formRouter } from './forms.js';
import { groupRouter, guestRouter } from './groups.js';
import { imageRouter } from './images.js';
import { rateLimit, securityHeaders } from './security.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json());
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.use('/api/tasks', requireUser);

app.get('/api/tasks', async (req, res) => {
  res.json(await listTasks(req.user!.id));
});

app.post('/api/tasks', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'title is required' });
    return;
  }
  res.status(HttpStatus.CREATED).json(await createTask(req.user!.id, title));
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { completed } = req.body ?? {};
  if (!Number.isInteger(id) || typeof completed !== 'boolean') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'a numeric id and boolean completed are required' });
    return;
  }
  const task = await setTaskCompleted(req.user!.id, id, completed);
  if (!task) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'task not found' });
    return;
  }
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await deleteTask(req.user!.id, id))) {
    res.status(HttpStatus.NOT_FOUND).json({ error: 'task not found' });
    return;
  }
  res.status(HttpStatus.NO_CONTENT).end();
});

app.use('/api/events', eventRouter);
app.use('/api/images', imageRouter);
// Public endpoints need no sign-in, so they are rate limited: personal link tokens can't be guessed or
// answers flooded at will.
const publicLimit = rateLimit(120, 60_000);
app.use('/api/forms', publicLimit, formRouter);
app.use('/api/groups', publicLimit, groupRouter);
app.use('/api/guests', publicLimit, guestRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDir = path.resolve('dist');
  app.use(express.static(clientDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

await migrateDatabase();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
