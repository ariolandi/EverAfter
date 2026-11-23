import type { ColorUsage, DressCode } from '../shared/types.js';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

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

// People the owner invited to manage an event with them, by Google account email (stored lowercased).
// An invite takes effect whenever someone signs in with that email, so it can be sent before they ever log in.
export const eventCoowners = pgTable(
  'event_coowners',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique('event_coowners_event_email').on(t.eventId, t.email), index('event_coowners_email').on(t.email)],
);

// Guests invited together (a family, a couple). Each group gets its own invitation link, opened by its token.
export const guestGroups = pgTable(
  'guest_groups',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    token: text('token').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index('guest_groups_event_id').on(t.eventId)],
);

export const guests = pgTable(
  'guests',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // A guest is in at most one group; deleting the group keeps the guest on the list.
    groupId: integer('group_id').references(() => guestGroups.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    isChild: boolean('is_child').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('guests_event_id').on(t.eventId), index('guests_group_id').on(t.groupId)],
);

// Menu options served at the event, each with one dish per course. Children's menus are flagged with `isChild`.
export const menus = pgTable(
  'menus',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isChild: boolean('is_child').notNull().default(false),
    salad: text('salad').notNull(),
    appetizer: text('appetizer').notNull(),
    mainCourse: text('main_course').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('menus_event_id').on(t.eventId)],
);

// The parts of an event's programme. `startTime` is a 24-hour HH:MM string, so it sorts chronologically as text.
export const scheduleItems = pgTable(
  'schedule_items',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startTime: text('start_time').notNull(),
    place: text('place').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('schedule_items_event_id').on(t.eventId)],
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
  // Indexes into `colors` of the colours marked primary and secondary.
  primaryColor: integer('primary_color').notNull().default(0),
  secondaryColor: integer('secondary_color').notNull().default(0),
  invitationText: text('invitation_text').notNull().default(''),
  dressCode: text('dress_code').$type<DressCode>().notNull().default('cocktail'),
  colorUsage: text('color_usage').$type<ColorUsage>().notNull().default('informative'),
  createdAt: createdAt(),
});

export const formResponses = pgTable(
  'form_responses',
  {
    id: serial('id').primaryKey(),
    formId: integer('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    // Set for answers sent from a group's link: one row per guest in the group.
    groupId: integer('group_id').references(() => guestGroups.id, { onDelete: 'cascade' }),
    // Kept as null if the guest is later removed; `name` still records who answered.
    guestId: integer('guest_id').references(() => guests.id, { onDelete: 'set null' }),
    name: text('name'),
    answer: boolean('answer'),
    // The menu the guest picked; kept as null if the menu is later deleted.
    menuId: integer('menu_id').references(() => menus.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('form_responses_form_id').on(t.formId), index('form_responses_group_id').on(t.groupId)],
);
