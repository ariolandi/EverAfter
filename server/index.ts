import './env.js';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import { authRouter, loadUser, requireUser } from './auth.js';
import { createTask, deleteTask, listTasks, migrateDatabase, setTaskCompleted } from './db.js';
import { formRouter } from './forms.js';
import { imageRouter } from './images.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

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

app.use('/api/images', imageRouter);
app.use('/api/forms', formRouter);

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
