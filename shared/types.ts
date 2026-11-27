export interface User {
  id: number;
  email: string;
  name: string;
  picture: string | null;
}

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface GeneratedImage {
  id: number;
  prompt: string;
  createdAt: string;
  url: string;
}

/** Largest picture, in bytes, that can be uploaded as an invitation's background. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Which components the builder has toggled on. */
export interface FormFields {
  showName: boolean;
  showAnswer: boolean;
}

/**
 * An invitation's theme colours, with exactly one marked primary and one secondary.
 * The two marks are on different colours whenever there is more than one.
 */
export interface InvitationColors {
  /** Theme colours as #rrggbb hex strings. */
  colors: string[];
  /** Index in `colors` of the primary colour, which the invitation's text is written in. */
  primaryColor: number;
  /** Index in `colors` of the secondary colour. */
  secondaryColor: number;
}

/** How formal the dress code is. */
export const DRESS_CODES = ['cocktail', 'formal'] as const;
export type DressCode = (typeof DRESS_CODES)[number];

/** How strictly guests are asked to wear the invitation's colours. */
export const COLOR_USAGES = ['mandatory', 'suggested', 'informative'] as const;
export type ColorUsage = (typeof COLOR_USAGES)[number];

export interface InvitationDetails extends InvitationColors {
  /** The organiser's name first, then up to MAX_ORGANIZERS - 1 co-organisers. */
  organizers: string[];
  /** Wedding date as YYYY-MM-DD, or '' when not set. */
  weddingDate: string;
  /** Where the wedding takes place. */
  place: string;
  /** Free text of the invitation, shown on its first page; '' when not set. */
  invitationText: string;
  /** Organiser's note shown above the choices on the accommodation page; '' when not set. */
  accommodationNotes: string;
  /** Organiser's note shown above the choices on the transport page; '' when not set. */
  transportNotes: string;
  /** Dress code shown on the invitation's schedule page. */
  dressCode: DressCode;
  /** Whether guests must, are advised to, or are just told about wearing the colours. */
  colorUsage: ColorUsage;
}

/** The organiser and the co-organisers together. */
export const MAX_ORGANIZERS = 3;

export const MAX_INVITATION_TEXT_LENGTH = 2000;

/** Longest note on the accommodation or transport page. */
export const MAX_NOTES_LENGTH = 1000;

/** Longest name of a person, event, group or menu. */
export const MAX_NAME_LENGTH = 100;

/** Longest name of who a guest would like to share a room with. */
export const MAX_ROOM_WITH_LENGTH = MAX_NAME_LENGTH;

/** Longest note a guest can leave about themselves, e.g. on dietary restrictions. */
export const MAX_GUEST_NOTES_LENGTH = MAX_NOTES_LENGTH;

export const MAX_PLACE_LENGTH = 200;

export const MAX_DISH_LENGTH = 200;

/** The longest valid email address (RFC 5321). */
export const MAX_EMAIL_LENGTH = 254;

export const MAX_GROUP_SIZE = 50;

export const MAX_COLORS = 10;

export interface PublishedForm extends FormFields, InvitationDetails {
  slug: string;
  imageId: number | null;
  imageUrl: string | null;
}

/** An invitation as a guest sees it: with the event's schedule for its schedule page. */
export interface SharedInvitation extends PublishedForm {
  /** The event's name, shown as the invitation's heading. */
  eventName: string;
  schedule: ScheduleItem[];
  /** The event's menus, shown on the invitation's menus page. */
  menus: Menu[];
}

export interface EventInfo {
  id: number;
  name: string;
  createdAt: string;
  guestCount: number;
  /** The event's published invitation, or null when none has been created yet. */
  invitation: PublishedForm | null;
  /** Whether the signed-in user created the event; co-owners can't delete it or change its co-owners. */
  isOwner: boolean;
  /** Who created the event, shown to co-owners. */
  ownerName: string;
}

/** Someone invited to manage an event alongside its owner. */
export interface Coowner {
  id: number;
  email: string;
  /** Their name once they have signed in at least once, otherwise null. */
  name: string | null;
  createdAt: string;
}

export interface Guest {
  id: number;
  name: string;
  /** The group the guest is invited with, or null when they aren't in one. */
  groupId: number | null;
  /** Opens the guest's own invitation link, /i/<token>. */
  token: string;
  /** Children are shown apart from adults and are meant for the event's children's menus. */
  isChild: boolean;
  createdAt: string;
}

export interface GuestInput {
  name: string;
  isChild?: boolean;
}

/** The dishes of a menu, one per course. */
export interface MenuCourses {
  salad: string;
  appetizer: string;
  mainCourse: string;
}

/** The courses every menu has, in the order they are served. */
export const MENU_COURSE_KEYS = ['salad', 'appetizer', 'mainCourse'] as const satisfies readonly (keyof MenuCourses)[];

export interface MenuInput extends MenuCourses {
  name: string;
  /** Whether this is a children's menu. */
  isChild: boolean;
}

/** A menu option offered at the event. */
export interface Menu extends MenuInput {
  id: number;
  createdAt: string;
}

/** The menus a guest may pick: children may have any, but the children's menus are only for children. */
export const menusForGuest = <M extends { isChild: boolean }>(menus: M[], isChild: boolean): M[] =>
  isChild ? menus : menus.filter((menu) => !menu.isChild);

/** The shape of a schedule item's start time: 24-hour HH:MM. */
export const SCHEDULE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ScheduleItemInput {
  title: string;
  /** Starting hour as 24-hour HH:MM. */
  startTime: string;
  place: string;
}

/** One part of the event's programme, e.g. the ceremony or the dinner. */
export interface ScheduleItem extends ScheduleItemInput {
  id: number;
  createdAt: string;
}

/** An answer sent from the invitation's general link: the name the guest typed and their choices. */
export interface FormResponseInput {
  name?: string;
  answer?: boolean;
  /** Required when the guest comes and has a menu to choose from. */
  menuId?: number;
  /** Required when the guest comes. */
  accommodation?: boolean;
  /** Required when the guest comes. */
  transport?: Transport;
  /** Who the guest would like to share a room with. */
  roomWith?: string;
  /** Notes from the guest, e.g. about dietary restrictions. */
  notes?: string;
}

/** One guest's answer, sent from a group's link or their own, or entered by an organizer. */
/**
 * How a guest gets to the event: with their own transport, or without it and either wanting the organizers' help
 * or arranging it themselves.
 */
export const TRANSPORT_OPTIONS = ['own', 'needsHelp', 'arrangesOwn'] as const;
export type Transport = (typeof TRANSPORT_OPTIONS)[number];

export interface GroupGuestAnswer {
  guestId: number;
  /** Omitted when the invitation doesn't ask whether they will attend. */
  answer?: boolean;
  /** The menu the guest picked; required when the guest comes and has a menu to choose from. */
  menuId?: number;
  /** Whether the guest will use the offered accommodation; required when the guest comes. */
  accommodation?: boolean;
  /** How the guest travels; required when the guest comes. */
  transport?: Transport;
  /** Name of who the guest would like to share a room with; only asked of guests invited on their own. */
  roomWith?: string;
  /** Notes from the guest, e.g. about dietary restrictions. */
  notes?: string;
}

export interface GroupResponseInput {
  answers: GroupGuestAnswer[];
}

/** A recorded answer of one guest in a group. */
export interface GroupGuestResponse {
  /** Null if the guest has since been removed from the guest list. */
  guestId: number | null;
  name: string;
  answer: boolean | null;
  /** The menu the guest picked; null if they didn't pick one, or it has since been deleted. */
  menuId: number | null;
  /** Null if the guest doesn't come. */
  accommodation: boolean | null;
  /** Null if the guest doesn't come. */
  transport: Transport | null;
}

/** A guest's recorded answer. Fields that don't apply (a guest who doesn't come picks no menu) are null. */
export interface GuestResponse {
  respondedAt: string;
  /** Null when the invitation doesn't ask whether the guest will attend. */
  answer: boolean | null;
  menuId: number | null;
  accommodation: boolean | null;
  transport: Transport | null;
  /** Who the guest would like to share a room with; null when not given. */
  roomWith?: string | null;
  /** Notes from the guest, e.g. about dietary restrictions; null when not given. */
  notes?: string | null;
}

/** A group's answers, as far as its guests have answered. */
export interface GroupResponse {
  respondedAt: string;
  guests: GroupGuestResponse[];
}

/** Guests invited together, as the event's organizers see them. */
export interface GuestGroup {
  id: number;
  name: string;
  /** Opens the group's personal invitation link, /g/<token>. */
  token: string;
  guestIds: number[];
  /** Null until one of the group's guests has answered the invitation. */
  response: GroupResponse | null;
  createdAt: string;
}

export interface GuestGroupInput {
  name: string;
  guestIds: number[];
}

/** A guest an invitation link is addressed to, with their answer once it has been sent. */
export interface InvitedGuest {
  id: number;
  name: string;
  isChild: boolean;
  response: GuestResponse | null;
}

/**
 * What a personal link (a group's, or a single guest's) shows: the invitation, who it is for and their answers.
 * Guests who have answered are shown read-only; the rest can still answer.
 */
export interface GroupInvitation {
  form: PublishedForm;
  /** The event's name, shown as the invitation's heading. */
  eventName: string;
  schedule: ScheduleItem[];
  /** The group's name, or the guest's own name on their personal link. */
  groupName: string;
  guests: InvitedGuest[];
  /** The event's menus, for the menus page and for each guest to pick from. */
  menus: Menu[];
}

/** One line of the organizers' table of answers: a guest and their answer, or a general-link answer without a guest. */
export interface ResponseEntry {
  /** Null for an answer sent from the invitation's general link, where the guest typed their own name. */
  guestId: number | null;
  /** The id of a general-link answer, so organizers can correct it; null on a guest's line. */
  generalResponseId: number | null;
  name: string;
  groupName: string | null;
  /** Null while the guest hasn't answered. */
  response: GuestResponse | null;
}

/** What an organizer enters to record or change a guest's answer. */
export type GuestResponseInput = Omit<GroupGuestAnswer, 'guestId'>;
