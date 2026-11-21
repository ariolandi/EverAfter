import { afterEach, vi } from 'vitest';

// Route tests mock ./db.js, but it is still resolved; it refuses to load without a database URL.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.GOOGLE_CLIENT_ID ??= 'test-client-id';

afterEach(() => {
  vi.clearAllMocks();
});
