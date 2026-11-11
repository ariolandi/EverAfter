import { and, desc, eq, exists, gt, inArray, lte, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type {
  Coowner,
  EventInfo,
  FormFields,
  GeneratedImage,
  Guest,
  InvitationDetails,
  PublishedForm,
  Task,
  User,
} from '../shared/types.js';
import { eventCoowners, events, formResponses, forms, guests, images, sessions, tasks, users } from './schema.js';

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

/** Who is asking: event access depends on both their id (owner) and their email (co-owner invites). */
type Viewer = Pick<User, 'id' | 'email'>;

/** Co-owner invites are matched case-insensitively, so emails are stored and compared lowercased. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** SQL condition: the viewer owns the event in the current row, or was invited as its co-owner. */
const canAccessEvent = (viewer: Viewer) =>
  or(
    eq(events.userId, viewer.id),
    exists(
      db
        .select({ id: eventCoowners.id })
        .from(eventCoowners)
        .where(and(eq(eventCoowners.eventId, events.id), eq(eventCoowners.email, normalizeEmail(viewer.email)))),
    ),
  );

const accessibleEventIds = (viewer: Viewer) => db.select({ id: events.id }).from(events).where(canAccessEvent(viewer));

const eventSelection = {
  event: events,
  form: forms,
  ownerName: users.name,
  guestCount: db.$count(guests, eq(guests.eventId, events.id)),
};

const toEvent = (
  viewer: Viewer,
  row: {
    event: typeof events.$inferSelect;
    form: typeof forms.$inferSelect | null;
    ownerName: string;
    guestCount: number;
  },
): EventInfo => ({
  id: row.event.id,
  name: row.event.name,
  createdAt: row.event.createdAt.toISOString(),
  guestCount: row.guestCount,
  invitation: row.form && toForm(row.form),
  isOwner: row.event.userId === viewer.id,
  ownerName: row.ownerName,
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

/** Events the viewer owns or co-owns. */
export async function listEvents(viewer: Viewer): Promise<EventInfo[]> {
  const rows = await db
    .select(eventSelection)
    .from(events)
    .innerJoin(users, eq(users.id, events.userId))
    .leftJoin(forms, eq(forms.eventId, events.id))
    .where(canAccessEvent(viewer))
    .orderBy(desc(events.createdAt), desc(events.id));
  return rows.map((row) => toEvent(viewer, row));
}

/** The event if the viewer owns or co-owns it. */
export async function getEvent(viewer: Viewer, id: number): Promise<EventInfo | undefined> {
  const [row] = await db
    .select(eventSelection)
    .from(events)
    .innerJoin(users, eq(users.id, events.userId))
    .leftJoin(forms, eq(forms.eventId, events.id))
    .where(and(eq(events.id, id), canAccessEvent(viewer)));
  return row && toEvent(viewer, row);
}

export async function createEvent(owner: User, name: string): Promise<EventInfo> {
  const [row] = await db.insert(events).values({ userId: owner.id, name }).returning();
  return toEvent(owner, { event: row, form: null, ownerName: owner.name, guestCount: 0 });
}

export async function deleteEvent(userId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning({ id: events.id });
  return deleted.length > 0;
}

// Co-owner and guest queries take an event id the caller has already checked the signed-in user may manage.
export async function listCoowners(eventId: number): Promise<Coowner[]> {
  const rows = await db
    .select({
      id: eventCoowners.id,
      email: eventCoowners.email,
      createdAt: eventCoowners.createdAt,
      name: sql<string | null>`(select ${users.name} from ${users} where lower(${users.email}) = ${eventCoowners.email} limit 1)`,
    })
    .from(eventCoowners)
    .where(eq(eventCoowners.eventId, eventId))
    .orderBy(eventCoowners.createdAt, eventCoowners.id);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/** Invites a co-owner; resolves to undefined if that email is already invited to the event. */
export async function addCoowner(eventId: number, email: string): Promise<Coowner | undefined> {
  const normalized = normalizeEmail(email);
  const [row] = await db
    .insert(eventCoowners)
    .values({ eventId, email: normalized })
    .onConflictDoNothing()
    .returning();
  if (!row) return undefined;
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(sql`lower(${users.email})`, normalized))
    .limit(1);
  return { id: row.id, email: row.email, name: user?.name ?? null, createdAt: row.createdAt.toISOString() };
}

export async function deleteCoowner(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(eventCoowners)
    .where(and(eq(eventCoowners.id, id), eq(eventCoowners.eventId, eventId)))
    .returning({ id: eventCoowners.id });
  return deleted.length > 0;
}

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

// Anyone who can manage the event (owner or co-owner) can edit or delete its invitation.
export async function updateForm(
  viewer: Viewer,
  slug: string,
  imageId: number | null,
  fields: FormFields,
  details: InvitationDetails,
): Promise<PublishedForm | undefined> {
  const [row] = await db
    .update(forms)
    .set({ imageId, ...fields, ...details })
    .where(and(eq(forms.slug, slug), inArray(forms.eventId, accessibleEventIds(viewer))))
    .returning();
  return row && toForm(row);
}

export async function deleteForm(viewer: Viewer, slug: string): Promise<boolean> {
  const deleted = await db
    .delete(forms)
    .where(and(eq(forms.slug, slug), inArray(forms.eventId, accessibleEventIds(viewer))))
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
