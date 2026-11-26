import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../shared/types';
import App from './App';
import { api } from './api';
import { eventInfo } from './test/fixtures';
import { renderWithTheme } from './test/render';

vi.mock('./api');
// Google's button loads a script from Google; a plain button stands in for it.
vi.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
    GoogleLogin: ({ onSuccess }: { onSuccess: (res: { credential?: string }) => void }) => (
        <button onClick={() => onSuccess({ credential: 'google-token' })}>Sign in with Google</button>
    ),
}));

const user: User = { id: 1, email: 'maria@example.com', name: 'Мария', picture: null };

describe('App', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/');
        vi.mocked(api.authConfig).mockResolvedValue({ googleClientId: 'client-id' });
        vi.mocked(api.listEvents).mockResolvedValue([eventInfo({ id: 1, name: 'Сватба' })]);
    });

    it('asks a signed-out visitor to sign in with Google', async () => {
        vi.mocked(api.me).mockResolvedValue(null);
        vi.mocked(api.loginWithGoogle).mockResolvedValue(user);
        const { user: actor } = renderWithTheme(<App />);

        expect(await screen.findByText('Welcome')).toBeInTheDocument();
        await actor.click(screen.getByRole('button', { name: 'Sign in with Google' }));

        expect(api.loginWithGoogle).toHaveBeenCalledWith('google-token');
        expect(await screen.findByRole('heading', { name: 'Моите събития' })).toBeInTheDocument();
        expect(screen.getByText('Мария')).toBeInTheDocument();
    });

    it('explains when Google login is not configured', async () => {
        vi.mocked(api.authConfig).mockResolvedValue({ googleClientId: null });
        vi.mocked(api.me).mockResolvedValue(null);
        renderWithTheme(<App />);
        expect(await screen.findByText(/Google login is not configured/)).toBeInTheDocument();
    });

    it('shows a signed-in user their events and moves between screens', async () => {
        vi.mocked(api.me).mockResolvedValue(user);
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ id: 1, name: 'Сватба' }));
        vi.mocked(api.listGuests).mockResolvedValue([]);
        vi.mocked(api.listGroups).mockResolvedValue([]);
        vi.mocked(api.listCoowners).mockResolvedValue([]);
        vi.mocked(api.listMenus).mockResolvedValue([]);
        vi.mocked(api.listResponses).mockResolvedValue([]);
        vi.mocked(api.listSchedule).mockResolvedValue([]);
        vi.mocked(api.listImages).mockResolvedValue([]);
        const { user: actor } = renderWithTheme(<App />);

        await actor.click(await screen.findByText('Сватба'));
        expect(await screen.findByRole('heading', { name: 'Сватба' })).toBeInTheDocument();

        await actor.click(screen.getByRole('button', { name: 'Създай покана' }));
        expect(await screen.findByRole('heading', { name: 'Създай своята покана' })).toBeInTheDocument();

        await actor.click(screen.getByRole('button', { name: 'Към събитието' }));
        await actor.click(await screen.findByRole('button', { name: 'Всички събития' }));
        expect(await screen.findByRole('heading', { name: 'Моите събития' })).toBeInTheDocument();
    });

    it('gives each event its own URL and follows the browser back button', async () => {
        mockSignedInEvent();
        const { user: actor } = renderWithTheme(<App />);

        await actor.click(await screen.findByText('Сватба'));
        expect(await screen.findByRole('heading', { name: 'Сватба' })).toBeInTheDocument();
        expect(window.location.pathname).toBe('/events/1');

        await actor.click(screen.getByRole('button', { name: 'Създай покана' }));
        expect(await screen.findByRole('heading', { name: 'Създай своята покана' })).toBeInTheDocument();
        expect(window.location.pathname).toBe('/events/1/invitation');

        await goBack();
        expect(await screen.findByRole('heading', { name: 'Сватба' })).toBeInTheDocument();
        await goBack();
        expect(await screen.findByRole('heading', { name: 'Моите събития' })).toBeInTheDocument();
    });

    it('opens an event directly from its URL', async () => {
        window.history.replaceState(null, '', '/events/1');
        mockSignedInEvent();
        renderWithTheme(<App />);
        expect(await screen.findByRole('heading', { name: 'Сватба' })).toBeInTheDocument();
        expect(api.getEvent).toHaveBeenCalledWith(1);
    });

    it('signs out', async () => {
        vi.mocked(api.me).mockResolvedValue(user);
        vi.mocked(api.logout).mockResolvedValue(undefined);
        const { user: actor } = renderWithTheme(<App />);

        await actor.click(await screen.findByRole('button', { name: 'Sign out' }));
        expect(api.logout).toHaveBeenCalled();
        expect(await screen.findByText('Welcome')).toBeInTheDocument();
    });

    it('shows the error when loading fails', async () => {
        vi.mocked(api.me).mockRejectedValue(new Error('server unavailable'));
        renderWithTheme(<App />);
        expect(await screen.findByText('server unavailable')).toBeInTheDocument();
    });
});

function mockSignedInEvent() {
    vi.mocked(api.me).mockResolvedValue(user);
    vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ id: 1, name: 'Сватба' }));
    vi.mocked(api.listGuests).mockResolvedValue([]);
    vi.mocked(api.listGroups).mockResolvedValue([]);
    vi.mocked(api.listCoowners).mockResolvedValue([]);
    vi.mocked(api.listMenus).mockResolvedValue([]);
    vi.mocked(api.listResponses).mockResolvedValue([]);
    vi.mocked(api.listSchedule).mockResolvedValue([]);
    vi.mocked(api.listImages).mockResolvedValue([]);
}

/** Presses the browser's back button and waits for the popstate it fires. */
async function goBack() {
    await act(async () => {
        const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
        window.history.back();
        await popped;
    });
}
