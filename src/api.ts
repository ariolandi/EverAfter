import { HttpStatus } from '../shared/httpStatus';
import type {
  Coowner,
  EventInfo,
  FormFields,
  FormResponseInput,
  GeneratedImage,
  Guest,
  InvitationDetails,
  PublishedForm,
  Task,
  User,
} from '../shared/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    // API data must always come from the server, never a stale HTTP cache entry.
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.status === HttpStatus.NO_CONTENT ? (undefined as T) : res.json();
}

export const api = {
  authConfig: () => request<{ googleClientId: string | null }>('/api/auth/config'),
  me: () => request<User | null>('/api/auth/me'),
  loginWithGoogle: (credential: string) =>
    request<User>('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  listTasks: () => request<Task[]>('/api/tasks'),
  createTask: (title: string) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  setCompleted: (id: number, completed: boolean) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  listImages: () => request<GeneratedImage[]>('/api/images'),
  generateImage: (prompt: string) =>
    request<GeneratedImage>('/api/images', { method: 'POST', body: JSON.stringify({ prompt }) }),
  deleteImage: (id: number) => request<void>(`/api/images/${id}`, { method: 'DELETE' }),

  listEvents: () => request<EventInfo[]>('/api/events'),
  getEvent: (id: number) => request<EventInfo>(`/api/events/${id}`),
  createEvent: (name: string) =>
    request<EventInfo>('/api/events', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteEvent: (id: number) => request<void>(`/api/events/${id}`, { method: 'DELETE' }),
  listCoowners: (eventId: number) => request<Coowner[]>(`/api/events/${eventId}/coowners`),
  addCoowner: (eventId: number, email: string) =>
    request<Coowner>(`/api/events/${eventId}/coowners`, { method: 'POST', body: JSON.stringify({ email }) }),
  deleteCoowner: (eventId: number, id: number) =>
    request<void>(`/api/events/${eventId}/coowners/${id}`, { method: 'DELETE' }),
  listGuests: (eventId: number) => request<Guest[]>(`/api/events/${eventId}/guests`),
  addGuest: (eventId: number, name: string) =>
    request<Guest>(`/api/events/${eventId}/guests`, { method: 'POST', body: JSON.stringify({ name }) }),
  deleteGuest: (eventId: number, id: number) =>
    request<void>(`/api/events/${eventId}/guests/${id}`, { method: 'DELETE' }),

  publishForm: (eventId: number, imageId: number | null, fields: FormFields, details: InvitationDetails) =>
    request<PublishedForm>('/api/forms', {
      method: 'POST',
      body: JSON.stringify({ eventId, imageId, ...fields, ...details }),
    }),
  updateForm: (slug: string, imageId: number | null, fields: FormFields, details: InvitationDetails) =>
    request<PublishedForm>(`/api/forms/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify({ imageId, ...fields, ...details }),
    }),
  deleteForm: (slug: string) => request<void>(`/api/forms/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  getForm: (slug: string) => request<PublishedForm>(`/api/forms/${encodeURIComponent(slug)}`),
  submitFormResponse: (slug: string, response: FormResponseInput) =>
    request<void>(`/api/forms/${encodeURIComponent(slug)}/responses`, {
      method: 'POST',
      body: JSON.stringify(response),
    }),
};
