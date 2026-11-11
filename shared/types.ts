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
  createdAt: string;
}

export interface FormResponseInput {
  name?: string;
  answer?: boolean;
}
