import { boolean, customType, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  picture: text('picture'),
  createdAt: createdAt(),
});

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    completed: boolean('completed').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('tasks_user_id').on(t.userId)],
);

export const images = pgTable(
  'images',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    mimeType: text('mime_type').notNull(),
    data: bytea('data').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('images_user_id').on(t.userId)],
);

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('events_user_id').on(t.userId)],
);

export const guests = pgTable(
  'guests',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('guests_event_id').on(t.eventId)],
);

export const forms = pgTable('forms', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Each event has at most one invitation.
  eventId: integer('event_id')
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  imageId: integer('image_id').references(() => images.id, { onDelete: 'set null' }),
  showName: boolean('show_name').notNull(),
  showAnswer: boolean('show_answer').notNull(),
  brideName: text('bride_name').notNull(),
  groomName: text('groom_name').notNull(),
  weddingDate: text('wedding_date').notNull(),
  place: text('place').notNull(),
  colors: jsonb('colors').$type<string[]>().notNull(),
  createdAt: createdAt(),
});

export const formResponses = pgTable(
  'form_responses',
  {
    id: serial('id').primaryKey(),
    formId: integer('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    name: text('name'),
    answer: boolean('answer'),
    createdAt: createdAt(),
  },
  (t) => [index('form_responses_form_id').on(t.formId)],
);
