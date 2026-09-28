import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import database from './database.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const directory = path.dirname(fileURLToPath(import.meta.url))
const clientBuild = path.resolve(directory, '../dist')

function presentTask(row) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
  }
}

app.use('/api', express.json({ limit: '16kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/tasks', (_request, response) => {
  const rows = database.prepare('SELECT * FROM tasks ORDER BY id DESC').all()
  response.json(rows.map(presentTask))
})

app.post('/api/tasks', (request, response) => {
  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : ''
  if (!title || title.length > 240) {
    return response.status(400).json({ error: 'Task title must be between 1 and 240 characters.' })
  }

  const result = database.prepare('INSERT INTO tasks (title) VALUES (?)').run(title)
  const row = database.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  response.status(201).json(presentTask(row))
})

app.patch('/api/tasks/:id', (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1 || typeof request.body?.completed !== 'boolean') {
    return response.status(400).json({ error: 'A valid task ID and completed value are required.' })
  }

  const result = database
    .prepare('UPDATE tasks SET completed = ? WHERE id = ?')
    .run(Number(request.body.completed), id)
  if (result.changes === 0) {
    return response.status(404).json({ error: 'Task not found.' })
  }

  const row = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  response.json(presentTask(row))
})

app.delete('/api/tasks/:id', (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: 'A valid task ID is required.' })
  }

  const result = database.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  if (result.changes === 0) {
    return response.status(404).json({ error: 'Task not found.' })
  }

  response.status(204).end()
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found.' })
})

app.use(express.static(clientBuild))
app.use((request, response, next) => {
  if (request.method !== 'GET') return next()
  response.sendFile(path.join(clientBuild, 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((error, _request, response, _next) => {
  if (response.headersSent) return
  const status = Number.isInteger(error.status) ? error.status : 500
  response.status(status).json({
    error: status < 500 ? error.message : 'An unexpected server error occurred.',
  })
})

const server = app.listen(port, () => {
  console.log(`EverAfter API listening on http://localhost:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      database.close()
      process.exit(0)
    })
  })
}