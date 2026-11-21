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

/** Which components the builder has toggled on. */
export interface FormFields {
  showName: boolean;
  showAnswer: boolean;
}

export interface InvitationDetails {
  brideName: string;
  groomName: string;
  /** Wedding date as YYYY-MM-DD, or '' when not set. */
  weddingDate: string;
  /** Where the wedding takes place. */
  place: string;
  /** Theme colours as #rrggbb hex strings. */
  colors: string[];
}

export const MAX_COLORS = 10;

export interface PublishedForm extends FormFields, InvitationDetails {
  slug: string;
  imageId: number | null;
  imageUrl: string | null;
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

export interface FormResponseInput {
  name?: string;
  answer?: boolean;
}

/** One guest's answer sent from a group link. */
export interface GroupGuestAnswer {
  guestId: number;
  /** Omitted when the invitation doesn't ask whether they will attend. */
  answer?: boolean;
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
}

/** A group's answer, once it has been sent. */
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
  /** Null until the group answers the invitation. */
  response: GroupResponse | null;
  createdAt: string;
}

export interface GuestGroupInput {
  name: string;
  guestIds: number[];
}

/** What a group's personal link shows: the invitation, who it is for, and their answer if already sent. */
export interface GroupInvitation {
  form: PublishedForm;
  groupName: string;
  guests: { id: number; name: string }[];
  response: GroupResponse | null;
}
