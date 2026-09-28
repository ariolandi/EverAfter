# EverAfter

A React + TypeScript frontend with an Express API and SQLite persistence.

## Requirements

- Node.js 20.17 or newer in the Node 20 line
- npm

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The API runs on port 3001 and Vite proxies `/api` requests to it. SQLite creates `data/everafter.sqlite` on first start.

## Production build

```sh
npm run build
npm start
```

The Express server serves the built frontend and API on port 3001. Set `PORT` to change the port or `DATABASE_PATH` to choose another SQLite file location.

## API

- `GET /api/health` checks the server
- `GET /api/tasks` lists tasks
- `POST /api/tasks` creates a task with `{ "title": "..." }`
- `PATCH /api/tasks/:id` updates completion with `{ "completed": true }`
- `DELETE /api/tasks/:id` removes a task