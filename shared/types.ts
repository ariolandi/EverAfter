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
  imageUrl: string | null;
}

export interface FormResponseInput {
  name?: string;
  answer?: boolean;
}
