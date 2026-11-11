import { and, desc, eq, gt, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type {
  EventInfo,
  FormFields,
  GeneratedImage,
  Guest,
  InvitationDetails,
  PublishedForm,
  Task,
  User,
} from '../shared/types.js';
import { events, formResponses, forms, guests, images, sessions, tasks, users } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set; see README for running PostgreSQL locally.');
}

const db = drizzle(databaseUrl);

/** Applies any pending migrations from the drizzle/ folder. */
export async function migrateDatabase(): Promise<void> {
  await migrate(db, { migrationsFolder: 'drizzle' });
}

const userColumns = { id: users.id, email: users.email, name: users.name, picture: users.picture };

const toTask = (row: typeof tasks.$inferSelect): Task => ({
  id: row.id,
  title: row.title,
  completed: row.completed,
  createdAt: row.createdAt.toISOString(),
});

const imageColumns = { id: images.id, prompt: images.prompt, createdAt: images.createdAt };

const toImage = (row: { id: number; prompt: string; createdAt: Date }): GeneratedImage => ({
  id: row.id,
  prompt: row.prompt,
  createdAt: row.createdAt.toISOString(),
  url: `/api/images/${row.id}/file`,
});

const toForm = (row: typeof forms.$inferSelect): PublishedForm => ({
  slug: row.slug,
  imageId: row.imageId,
  showName: row.showName,
  showAnswer: row.showAnswer,
  brideName: row.brideName,
  groomName: row.groomName,
  weddingDate: row.weddingDate,
  place: row.place,
  colors: row.colors,
  imageUrl: row.imageId === null ? null : `/api/forms/${row.slug}/image`,
});

const eventSelection = {
  event: events,
  form: forms,
  guestCount: db.$count(guests, eq(guests.eventId, events.id)),
};

const toEvent = (row: {
  event: typeof events.$inferSelect;
  form: typeof forms.$inferSelect | null;
  guestCount: number;
}): EventInfo => ({
  id: row.event.id,
  name: row.event.name,
  createdAt: row.event.createdAt.toISOString(),
  guestCount: row.guestCount,
  invitation: row.form && toForm(row.form),
});

const toGuest = (row: typeof guests.$inferSelect): Guest => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

export async function upsertGoogleUser(
  googleId: string,
  email: string,
  name: string,
  picture: string | null,
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ googleId, email, name, picture })
    .onConflictDoUpdate({ target: users.googleId, set: { email, name, picture } })
    .returning(userColumns);
  return user;
}

export async function createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void> {
  await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({ tokenHash, userId, expiresAt });
}

export async function getSessionUser(tokenHash: string): Promise<User | undefined> {
  const [user] = await db
    .select(userColumns)
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));
  return user;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function listTasks(userId: number): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt), desc(tasks.id));
  return rows.map(toTask);
}

export async function createTask(userId: number, title: string): Promise<Task> {
  const [row] = await db.insert(tasks).values({ userId, title }).returning();
  return toTask(row);
}

export async function setTaskCompleted(userId: number, id: number, completed: boolean): Promise<Task | undefined> {
  const [row] = await db
    .update(tasks)
    .set({ completed })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return row && toTask(row);
}

export async function deleteTask(userId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

export async function listImages(userId: number): Promise<GeneratedImage[]> {
  const rows = await db
    .select(imageColumns)
    .from(images)
    .where(eq(images.userId, userId))
    .orderBy(desc(images.createdAt), desc(images.id));
  return rows.map(toImage);
}

export async function createImage(
  userId: number,
  prompt: string,
  mimeType: string,
  data: Buffer,
): Promise<GeneratedImage> {
  const [row] = await db.insert(images).values({ userId, prompt, mimeType, data }).returning(imageColumns);
  return toImage(row);
}

export async function getImageFile(userId: number, id: number): Promise<{ mimeType: string; data: Buffer } | undefined> {
  const [row] = await db
    .select({ mimeType: images.mimeType, data: images.data })
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, userId)));
  return row;
}

export async function deleteImage(userId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(images)
    .where(and(eq(images.id, id), eq(images.userId, userId)))
    .returning({ id: images.id });
  return deleted.length > 0;
}

export async function listEvents(userId: number): Promise<EventInfo[]> {
  const rows = await db
    .select(eventSelection)
    .from(events)
    .leftJoin(forms, eq(forms.eventId, events.id))
    .where(eq(events.userId, userId))
    .orderBy(desc(events.createdAt), desc(events.id));
  return rows.map(toEvent);
}

export async function getEvent(userId: number, id: number): Promise<EventInfo | undefined> {
  const [row] = await db
    .select(eventSelection)
    .from(events)
    .leftJoin(forms, eq(forms.eventId, events.id))
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  return row && toEvent(row);
}

export async function createEvent(userId: number, name: string): Promise<EventInfo> {
  const [row] = await db.insert(events).values({ userId, name }).returning();
  return toEvent({ event: row, form: null, guestCount: 0 });
}

export async function deleteEvent(userId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning({ id: events.id });
  return deleted.length > 0;
}

// Guest queries take an event id the caller has already checked belongs to the signed-in user.
export async function listGuests(eventId: number): Promise<Guest[]> {
  const rows = await db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(guests.name, guests.id);
  return rows.map(toGuest);
}

export async function createGuest(eventId: number, name: string): Promise<Guest> {
  const [row] = await db.insert(guests).values({ eventId, name }).returning();
  return toGuest(row);
}

export async function deleteGuest(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(guests)
    .where(and(eq(guests.id, id), eq(guests.eventId, eventId)))
    .returning({ id: guests.id });
  return deleted.length > 0;
}

export async function createForm(
  userId: number,
  eventId: number,
  slug: string,
  imageId: number | null,
  fields: FormFields,
  details: InvitationDetails,
): Promise<PublishedForm> {
  const [row] = await db
    .insert(forms)
    .values({ userId, eventId, slug, imageId, ...fields, ...details })
    .returning();
  return toForm(row);
}

export async function updateForm(
  userId: number,
  slug: string,
  imageId: number | null,
  fields: FormFields,
  details: InvitationDetails,
): Promise<PublishedForm | undefined> {
  const [row] = await db
    .update(forms)
    .set({ imageId, ...fields, ...details })
    .where(and(eq(forms.slug, slug), eq(forms.userId, userId)))
    .returning();
  return row && toForm(row);
}

export async function deleteForm(userId: number, slug: string): Promise<boolean> {
  const deleted = await db
    .delete(forms)
    .where(and(eq(forms.slug, slug), eq(forms.userId, userId)))
    .returning({ id: forms.id });
  return deleted.length > 0;
}

export async function getForm(slug: string): Promise<{ id: number; form: PublishedForm } | undefined> {
  const [row] = await db.select().from(forms).where(eq(forms.slug, slug));
  return row && { id: row.id, form: toForm(row) };
}

export async function getFormImage(slug: string): Promise<{ mimeType: string; data: Buffer } | undefined> {
  const [row] = await db
    .select({ mimeType: images.mimeType, data: images.data })
    .from(forms)
    .innerJoin(images, eq(images.id, forms.imageId))
    .where(eq(forms.slug, slug));
  return row;
}

export async function createFormResponse(formId: number, name: string | null, answer: boolean | null): Promise<void> {
  await db.insert(formResponses).values({ formId, name, answer });
}
