import { and, asc, desc, eq, exists, gt, inArray, isNull, lte, notInArray, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type {
  Coowner,
  EventInfo,
  FormFields,
  GeneratedImage,
  Guest,
  GuestGroup,
  GuestResponse,
  InvitationDetails,
  InvitedGuest,
  Menu,
  MenuInput,
  PublishedForm,
  ResponseEntry,
  ScheduleItem,
  ScheduleItemInput,
  Task,
  Transport,
  User,
} from '../shared/types.js';
import {
  eventCoowners,
  events,
  formResponses,
  forms,
  guestGroups,
  guests,
  images,
  menus,
  scheduleItems,
  sessions,
  tasks,
  users,
} from './schema.js';

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
  organizers: row.organizers,
  weddingDate: row.weddingDate,
  place: row.place,
  colors: row.colors,
  primaryColor: row.primaryColor,
  secondaryColor: row.secondaryColor,
  invitationText: row.invitationText,
  accommodationNotes: row.accommodationNotes,
  transportNotes: row.transportNotes,
  dressCode: row.dressCode,
  colorUsage: row.colorUsage,
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
  groupId: row.groupId,
  token: row.token,
  isChild: row.isChild,
  createdAt: row.createdAt.toISOString(),
});

const toMenu = (row: typeof menus.$inferSelect): Menu => ({
  id: row.id,
  name: row.name,
  isChild: row.isChild,
  salad: row.salad,
  appetizer: row.appetizer,
  mainCourse: row.mainCourse,
  createdAt: row.createdAt.toISOString(),
});

const toScheduleItem = (row: typeof scheduleItems.$inferSelect): ScheduleItem => ({
  id: row.id,
  title: row.title,
  startTime: row.startTime,
  place: row.place,
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

export async function getImageFile(
  userId: number,
  id: number,
): Promise<{ mimeType: string; data: Buffer } | undefined> {
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

/** The invited person's name, once someone has signed in with that email. */
// Columns are written out with their tables: Drizzle prints them unqualified here, so "email" would mean users.email.
const coownerName = sql<string | null>`(
  select "users"."name" from ${users} where lower("users"."email") = "event_coowners"."email" limit 1
)`;

// Co-owner and guest queries take an event id the caller has already checked the signed-in user may manage.
export async function listCoowners(eventId: number): Promise<Coowner[]> {
  const rows = await db
    .select({
      id: eventCoowners.id,
      email: eventCoowners.email,
      createdAt: eventCoowners.createdAt,
      name: coownerName,
    })
    .from(eventCoowners)
    .where(eq(eventCoowners.eventId, eventId))
    .orderBy(eventCoowners.createdAt, eventCoowners.id);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/** Invites a co-owner; resolves to undefined if that email is already invited to the event. */
export async function addCoowner(eventId: number, email: string): Promise<Coowner | undefined> {
  const normalized = normalizeEmail(email);
  const [row] = await db.insert(eventCoowners).values({ eventId, email: normalized }).onConflictDoNothing().returning();
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

export async function createGuest(eventId: number, name: string, isChild: boolean, token: string): Promise<Guest> {
  const [row] = await db.insert(guests).values({ eventId, name, isChild, token }).returning();
  return toGuest(row);
}

export async function setGuestIsChild(eventId: number, id: number, isChild: boolean): Promise<Guest | undefined> {
  const [row] = await db
    .update(guests)
    .set({ isChild })
    .where(and(eq(guests.id, id), eq(guests.eventId, eventId)))
    .returning();
  return row && toGuest(row);
}

/** Adults' menus first, then children's, each by name. */
export async function listMenus(eventId: number): Promise<Menu[]> {
  const rows = await db
    .select()
    .from(menus)
    .where(eq(menus.eventId, eventId))
    .orderBy(menus.isChild, menus.name, menus.id);
  return rows.map(toMenu);
}

export async function createMenu(eventId: number, input: MenuInput): Promise<Menu> {
  const [row] = await db
    .insert(menus)
    .values({ eventId, ...input })
    .returning();
  return toMenu(row);
}

export async function updateMenu(eventId: number, id: number, input: MenuInput): Promise<Menu | undefined> {
  const [row] = await db
    .update(menus)
    .set(input)
    .where(and(eq(menus.id, id), eq(menus.eventId, eventId)))
    .returning();
  return row && toMenu(row);
}

export async function deleteMenu(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(menus)
    .where(and(eq(menus.id, id), eq(menus.eventId, eventId)))
    .returning({ id: menus.id });
  return deleted.length > 0;
}

export async function deleteGuest(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(guests)
    .where(and(eq(guests.id, id), eq(guests.eventId, eventId)))
    .returning({ id: guests.id });
  return deleted.length > 0;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const responseColumns = {
  groupId: formResponses.groupId,
  guestId: formResponses.guestId,
  name: formResponses.name,
  answer: formResponses.answer,
  menuId: formResponses.menuId,
  accommodation: formResponses.accommodation,
  transport: formResponses.transport,
  roomWith: formResponses.roomWith,
  createdAt: formResponses.createdAt,
};

/** A recorded answer row. */
type ResponseRow = {
  groupId: number | null;
  guestId: number | null;
  name: string | null;
  answer: boolean | null;
  menuId: number | null;
  accommodation: boolean | null;
  transport: Transport | null;
  roomWith: string | null;
  createdAt: Date;
};

const toGuestResponse = (row: ResponseRow): GuestResponse => ({
  respondedAt: row.createdAt.toISOString(),
  answer: row.answer,
  menuId: row.menuId,
  accommodation: row.accommodation,
  transport: row.transport,
  roomWith: row.roomWith,
});

/** The guests' answers to an invitation, by guest id; answers to a deleted invitation went with it. */
async function responsesOfGuests(guestIds: number[], formId: number | undefined): Promise<Map<number, ResponseRow>> {
  if (guestIds.length === 0 || formId === undefined) return new Map();
  const rows = await db
    .select(responseColumns)
    .from(formResponses)
    .where(and(inArray(formResponses.guestId, guestIds), eq(formResponses.formId, formId)))
    .orderBy(asc(formResponses.id));
  return new Map(rows.map((row) => [row.guestId!, row]));
}

async function formIdOfEvent(eventId: number): Promise<number | undefined> {
  const [row] = await db.select({ id: forms.id }).from(forms).where(eq(forms.eventId, eventId));
  return row?.id;
}

export async function listGroups(eventId: number): Promise<GuestGroup[]> {
  const groupRows = await db
    .select()
    .from(guestGroups)
    .where(eq(guestGroups.eventId, eventId))
    .orderBy(guestGroups.name, guestGroups.id);
  const ids = groupRows.map((g) => g.id);
  if (ids.length === 0) return [];
  const members = await db
    .select({ id: guests.id, name: guests.name, groupId: guests.groupId })
    .from(guests)
    .where(inArray(guests.groupId, ids))
    .orderBy(guests.name, guests.id);
  const responses = await responsesOfGuests(
    members.map((m) => m.id),
    await formIdOfEvent(eventId),
  );
  return groupRows.map((group) => {
    const own = members.filter((m) => m.groupId === group.id);
    const answered = own.flatMap((m) => {
      const row = responses.get(m.id);
      return row ? [{ member: m, row }] : [];
    });
    return {
      id: group.id,
      name: group.name,
      token: group.token,
      guestIds: own.map((m) => m.id),
      // The group's answer is made of its guests' answers, whichever link each of them answered from.
      response:
        answered.length === 0
          ? null
          : {
              respondedAt: new Date(Math.min(...answered.map(({ row }) => row.createdAt.getTime()))).toISOString(),
              guests: answered.map(({ member, row }) => ({
                guestId: member.id,
                name: row.name ?? member.name,
                answer: row.answer,
                menuId: row.menuId,
                accommodation: row.accommodation,
                transport: row.transport,
                roomWith: row.roomWith,
              })),
            },
      createdAt: group.createdAt.toISOString(),
    };
  });
}

/** Puts exactly `guestIds` (guests of the event) in the group, taking them out of any other group. */
async function setGroupMembers(tx: Tx, eventId: number, groupId: number, guestIds: number[]) {
  await tx
    .update(guests)
    .set({ groupId: null })
    .where(and(eq(guests.groupId, groupId), guestIds.length ? notInArray(guests.id, guestIds) : undefined));
  if (guestIds.length) {
    await tx
      .update(guests)
      .set({ groupId })
      .where(and(eq(guests.eventId, eventId), inArray(guests.id, guestIds)));
  }
}

/** Whether every id is a guest of the event. */
export async function areEventGuests(eventId: number, guestIds: number[]): Promise<boolean> {
  if (guestIds.length === 0) return true;
  const count = await db.$count(guests, and(eq(guests.eventId, eventId), inArray(guests.id, guestIds)));
  return count === new Set(guestIds).size;
}

async function getGroup(eventId: number, id: number): Promise<GuestGroup | undefined> {
  return (await listGroups(eventId)).find((g) => g.id === id);
}

export async function createGroup(
  eventId: number,
  name: string,
  token: string,
  guestIds: number[],
): Promise<GuestGroup> {
  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(guestGroups).values({ eventId, name, token }).returning({ id: guestGroups.id });
    await setGroupMembers(tx, eventId, row.id, guestIds);
    return row.id;
  });
  return (await getGroup(eventId, id))!;
}

export async function updateGroup(
  eventId: number,
  id: number,
  name: string,
  guestIds: number[],
): Promise<GuestGroup | undefined> {
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(guestGroups)
      .set({ name })
      .where(and(eq(guestGroups.id, id), eq(guestGroups.eventId, eventId)))
      .returning({ id: guestGroups.id });
    if (!row) return false;
    await setGroupMembers(tx, eventId, id, guestIds);
    return true;
  });
  return updated ? getGroup(eventId, id) : undefined;
}

export async function deleteGroup(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(guestGroups)
    .where(and(eq(guestGroups.id, id), eq(guestGroups.eventId, eventId)))
    .returning({ id: guestGroups.id });
  return deleted.length > 0;
}

/** The name of an event, for its public invitation; '' if the event is gone. */
export async function getEventName(eventId: number): Promise<string> {
  const [row] = await db.select({ name: events.name }).from(events).where(eq(events.id, eventId));
  return row?.name ?? '';
}

/** Everything a personal link needs: the invitation, who it is for, and what they have answered. */
export interface InvitationRecord {
  /** The group the link belongs to; null on a guest's own link. */
  groupId: number | null;
  /** The event's name, shown as the invitation's heading. */
  eventName: string;
  /** The group's name, or the guest's own name on their own link. */
  name: string;
  guests: InvitedGuest[];
  menus: Menu[];
  /** The event's invitation, or null if it hasn't been published yet. */
  form: { id: number; form: PublishedForm } | null;
  /** The event's schedule, shown on the invitation's schedule page. */
  schedule: ScheduleItem[];
}

type InviteeGuest = { id: number; name: string; isChild: boolean };

async function invitationRecord(
  eventId: number,
  groupId: number | null,
  name: string,
  members: InviteeGuest[],
  formRow: typeof forms.$inferSelect | null,
): Promise<InvitationRecord> {
  const [responses, schedule, eventMenus, eventName] = await Promise.all([
    responsesOfGuests(
      members.map((m) => m.id),
      formRow?.id,
    ),
    listScheduleItems(eventId),
    listMenus(eventId),
    getEventName(eventId),
  ]);
  return {
    groupId,
    eventName,
    name,
    guests: members.map((m) => {
      const row = responses.get(m.id);
      return { ...m, response: row ? toGuestResponse(row) : null };
    }),
    menus: eventMenus,
    form: formRow && { id: formRow.id, form: toForm(formRow) },
    schedule,
  };
}

/** A group's invitation, found by the group's token. */
export async function getGroupInvitation(token: string): Promise<InvitationRecord | undefined> {
  const [row] = await db
    .select({ group: guestGroups, form: forms })
    .from(guestGroups)
    .leftJoin(forms, eq(forms.eventId, guestGroups.eventId))
    .where(eq(guestGroups.token, token));
  if (!row) return undefined;
  const members = await db
    .select({ id: guests.id, name: guests.name, isChild: guests.isChild })
    .from(guests)
    .where(eq(guests.groupId, row.group.id))
    .orderBy(guests.name, guests.id);
  return invitationRecord(row.group.eventId, row.group.id, row.group.name, members, row.form);
}

/** A single guest's own invitation, found by the guest's token. */
export async function getGuestInvitation(token: string): Promise<InvitationRecord | undefined> {
  const [row] = await db
    .select({ guest: guests, form: forms })
    .from(guests)
    .leftJoin(forms, eq(forms.eventId, guests.eventId))
    .where(eq(guests.token, token));
  if (!row) return undefined;
  const { id, name, isChild } = row.guest;
  return invitationRecord(row.guest.eventId, null, name, [{ id, name, isChild }], row.form);
}

/** What is recorded for one guest. */
export interface GuestAnswerRow {
  guestId: number;
  name: string;
  answer: boolean | null;
  menuId: number | null;
  accommodation: boolean | null;
  transport: Transport | null;
  roomWith?: string | null;
}

/**
 * Records the answers of guests who have not answered yet, one row each. Resolves to false, recording nothing, if
 * any of them already answered (say, from their own link while the group's was open): each guest answers once.
 */
export async function createGuestResponses(
  formId: number,
  groupId: number | null,
  answers: GuestAnswerRow[],
): Promise<boolean> {
  const inserted = await db
    .insert(formResponses)
    .values(answers.map((a) => ({ formId, groupId, ...a })))
    .onConflictDoNothing()
    .returning({ id: formResponses.id });
  if (inserted.length === answers.length) return true;
  // Some were already answered: take back the rows that did go in, so the answer is all or nothing.
  if (inserted.length > 0) {
    await db.delete(formResponses).where(
      inArray(
        formResponses.id,
        inserted.map((r) => r.id),
      ),
    );
  }
  return false;
}

/** Records or replaces a guest's answer, as an organizer does. Resolves to false if the event has no such guest or invitation. */
export async function saveGuestResponse(
  eventId: number,
  guestId: number,
  values: Omit<GuestAnswerRow, 'guestId' | 'name'>,
): Promise<boolean> {
  const formId = await formIdOfEvent(eventId);
  const [guest] = await db
    .select({ name: guests.name, groupId: guests.groupId })
    .from(guests)
    .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  if (formId === undefined || !guest) return false;
  await db
    .insert(formResponses)
    .values({ formId, groupId: guest.groupId, guestId, name: guest.name, ...values })
    .onConflictDoUpdate({
      target: [formResponses.formId, formResponses.guestId],
      targetWhere: sql`${formResponses.guestId} is not null`,
      set: values,
    });
  return true;
}

/**
 * The organizers' table: every guest with their answer (or none yet), then answers sent from the invitation's
 * general link, where guests typed their own names.
 */
export async function listResponses(eventId: number): Promise<ResponseEntry[]> {
  const formId = await formIdOfEvent(eventId);
  const [guestRows, groupRows] = await Promise.all([listGuests(eventId), listGroups(eventId)]);
  const responses = await responsesOfGuests(
    guestRows.map((g) => g.id),
    formId,
  );
  const entries: ResponseEntry[] = guestRows.map((guest) => {
    const row = responses.get(guest.id);
    return {
      guestId: guest.id,
      generalResponseId: null,
      name: guest.name,
      groupName: groupRows.find((g) => g.id === guest.groupId)?.name ?? null,
      response: row ? toGuestResponse(row) : null,
    };
  });
  if (formId === undefined) return entries;
  const general = await db
    .select({ id: formResponses.id, ...responseColumns })
    .from(formResponses)
    .where(and(eq(formResponses.formId, formId), isNull(formResponses.guestId), isNull(formResponses.groupId)))
    .orderBy(asc(formResponses.id));
  return [
    ...entries,
    ...general.map((row) => ({
      guestId: null,
      generalResponseId: row.id,
      name: row.name ?? '',
      groupName: null,
      response: toGuestResponse(row),
    })),
  ];
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

export async function getForm(slug: string): Promise<{ id: number; eventId: number; form: PublishedForm } | undefined> {
  const [row] = await db.select().from(forms).where(eq(forms.slug, slug));
  return row && { id: row.id, eventId: row.eventId, form: toForm(row) };
}

export async function getFormImage(slug: string): Promise<{ mimeType: string; data: Buffer } | undefined> {
  const [row] = await db
    .select({ mimeType: images.mimeType, data: images.data })
    .from(forms)
    .innerJoin(images, eq(images.id, forms.imageId))
    .where(eq(forms.slug, slug));
  return row;
}

export async function createFormResponse(
  formId: number,
  name: string | null,
  values: Omit<GuestAnswerRow, 'guestId' | 'name'>,
): Promise<void> {
  await db.insert(formResponses).values({ formId, name, ...values });
}

/** Corrects an answer sent from the general link. Resolves to false if the event has no such answer. */
export async function updateGeneralResponse(
  eventId: number,
  responseId: number,
  name: string | null,
  values: Omit<GuestAnswerRow, 'guestId' | 'name'>,
): Promise<boolean> {
  const formId = await formIdOfEvent(eventId);
  if (formId === undefined) return false;
  const updated = await db
    .update(formResponses)
    .set({ name, ...values })
    .where(
      and(
        eq(formResponses.id, responseId),
        eq(formResponses.formId, formId),
        isNull(formResponses.guestId),
        isNull(formResponses.groupId),
      ),
    )
    .returning({ id: formResponses.id });
  return updated.length > 0;
}

/** In the order the parts take place. */
export async function listScheduleItems(eventId: number): Promise<ScheduleItem[]> {
  const rows = await db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.eventId, eventId))
    .orderBy(scheduleItems.startTime, scheduleItems.id);
  return rows.map(toScheduleItem);
}

export async function createScheduleItem(eventId: number, input: ScheduleItemInput): Promise<ScheduleItem> {
  const [row] = await db
    .insert(scheduleItems)
    .values({ eventId, ...input })
    .returning();
  return toScheduleItem(row);
}

export async function updateScheduleItem(
  eventId: number,
  id: number,
  input: ScheduleItemInput,
): Promise<ScheduleItem | undefined> {
  const [row] = await db
    .update(scheduleItems)
    .set(input)
    .where(and(eq(scheduleItems.id, id), eq(scheduleItems.eventId, eventId)))
    .returning();
  return row && toScheduleItem(row);
}

export async function deleteScheduleItem(eventId: number, id: number): Promise<boolean> {
  const deleted = await db
    .delete(scheduleItems)
    .where(and(eq(scheduleItems.id, id), eq(scheduleItems.eventId, eventId)))
    .returning({ id: scheduleItems.id });
  return deleted.length > 0;
}
