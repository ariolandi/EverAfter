import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Task = {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

type Filter = 'all' | 'active' | 'completed'

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    api<Task[]>('/api/tasks', { signal: controller.signal })
      .then(setTasks)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load tasks')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const remaining = tasks.filter((task) => !task.completed).length
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    setSaving(true)
    setError('')
    try {
      const task = await api<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: cleanTitle }),
      })
      setTasks((current) => [task, ...current])
      setTitle('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add task')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTask(task: Task) {
    setError('')
    try {
      const updated = await api<Task>(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      })
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update task')
    }
  }

  async function removeTask(id: number) {
    setError('')
    try {
      await api<void>(`/api/tasks/${id}`, { method: 'DELETE' })
      setTasks((current) => current.filter((task) => task.id !== id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete task')
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="EverAfter home">
          <span className="wordmark-mark">e</span> everafter
        </a>
        <span className="topbar-note">A quieter kind of checklist</span>
      </header>

      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">YOUR SPACE, YOUR PACE</p>
          <h1 id="page-title">Make room for<br />what matters.</h1>
          <p className="intro-copy">A small place to gather the things you want to get done.</p>
          <div className="daily-count" aria-live="polite">
            <span className="count-number">{remaining.toString().padStart(2, '0')}</span>
            <span>{remaining === 1 ? 'thing' : 'things'} left to do</span>
          </div>
        </div>

        <div className="task-panel">
          <form className="add-form" onSubmit={addTask}>
            <label className="sr-only" htmlFor="new-task">Add a task</label>
            <input
              id="new-task"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Something on your mind..."
              maxLength={240}
            />
            <button className="add-button" type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Adding...' : 'Add task'}
            </button>
          </form>

          <div className="list-toolbar">
            <h2>Your list <span>{tasks.length}</span></h2>
            <div className="filters" aria-label="Filter tasks">
              {(['all', 'active', 'completed'] as const).map((value) => (
                <button
                  className={filter === value ? 'filter-button selected' : 'filter-button'}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                  aria-pressed={filter === value}
                >
                  {value === 'all' ? 'All' : value === 'active' ? 'To do' : 'Done'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <ul className="task-list" aria-live="polite">
            {loading ? (
              <li className="empty-state">Gathering your list...</li>
            ) : visibleTasks.length > 0 ? visibleTasks.map((task) => (
              <li className={task.completed ? 'task-item completed' : 'task-item'} key={task.id}>
                <label className="task-label">
                  <input
                    checked={task.completed}
                    onChange={() => void toggleTask(task)}
                    type="checkbox"
                  />
                  <span className="checkmark" aria-hidden="true" />
                  <span className="task-title">{task.title}</span>
                </label>
                <button
                  aria-label={`Delete ${task.title}`}
                  className="delete-button"
                  onClick={() => void removeTask(task.id)}
                  type="button"
                >
                  Delete
                </button>
              </li>
            )) : (
              <li className="empty-state">
                {tasks.length === 0 ? 'Your list is clear. Add a task to begin.' : 'Nothing in this view.'}
              </li>
            )}
          </ul>

          <footer className="list-footer">
            <span>Saved on this device</span>
            <span className="storage-indicator"><i /> SQLite</span>
          </footer>
        </div>
      </section>

      <footer className="page-footer">
        <span>EVERAFTER</span>
        <span>One thing at a time.</span>
      </footer>
    </main>
  )
}

export default App
