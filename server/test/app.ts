import express, { type Router } from 'express';
import type { User } from '../../shared/types.js';

export const testUser: User = { id: 1, email: 'maria@example.com', name: 'Мария', picture: null };

/** An app serving one router, with `user` signed in (or nobody when null). */
export function appWith(path: string, router: Router, user: User | null = testUser) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use(path, router);
  return app;
}
