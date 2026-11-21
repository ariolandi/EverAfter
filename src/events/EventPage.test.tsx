import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { eventInfo, guest, guestGroup, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import EventPage from './EventPage';

vi.mock('../api');

const renderPage = () => {
    const props = { eventId: 1, onBack: vi.fn(), onEditInvitation: vi.fn() };
    return { props, ...renderWithTheme(<EventPage {...props} />) };
};

describe('EventPage', () => {
    beforeEach(() => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.listGuests).mockResolvedValue([guest(1, 'Иван Иванов', 10), guest(2, 'Петър Петров')]);
        vi.mocked(api.listGroups).mockResolvedValue([guestGroup({ id: 10, name: 'Иванови', guestIds: [1] })]);
        vi.mocked(api.listCoowners).mockResolvedValue([]);
        vi.mocked(api.listMenus).mockResolvedValue([]);
        vi.mocked(api.listSchedule).mockResolvedValue([]);
    });

    it('shows the event with its guests, their groups and the invitation', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { name: 'Нашата сватба' })).toBeInTheDocument();
        expect(api.listGroups).toHaveBeenCalledWith(1);
        expect(screen.getByRole('heading', { name: 'Списък с гости (2)' })).toBeInTheDocument();

        const ivan = screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith('Иван Иванов'))!;
        expect(ivan).toHaveTextContent('Иван ИвановИванови');
        expect(screen.getByRole('region', { name: 'Иванови' })).toBeInTheDocument();
        expect(screen.getByText('Мария & Иван')).toBeInTheDocument();
        expect(screen.getByLabelText('Share link')).toHaveValue(`${window.location.origin}/f/abc123`);
    });

    it('adds a guest and keeps the list sorted', async () => {
        vi.mocked(api.addGuest).mockResolvedValue(guest(3, 'Ана Антонова'));
        const { user } = renderPage();
        await user.type(await screen.findByLabelText('Име на гост'), '  Ана Антонова ');
        await user.click(screen.getByRole('button', { name: 'Добави' }));

        expect(api.addGuest).toHaveBeenCalledWith(1, { name: 'Ана Антонова', isChild: false });
        expect(await screen.findByRole('heading', { name: 'Списък с гости (3)' })).toBeInTheDocument();
        expect(screen.getByLabelText('Име на гост')).toHaveValue('');
        const names = screen.getAllByRole('listitem').map((li) => li.textContent);
        expect(names.slice(0, 3)).toEqual(['Ана Антонова', 'Иван ИвановИванови', 'Петър Петров']);
    });

    it('adds a guest as a child', async () => {
        vi.mocked(api.addGuest).mockResolvedValue(guest(3, 'Ники', null, true));
        const { user } = renderPage();
        await user.type(await screen.findByLabelText('Име на гост'), 'Ники');
        await user.click(screen.getByLabelText('Дете'));
        await user.click(screen.getByRole('button', { name: 'Добави' }));

        expect(api.addGuest).toHaveBeenCalledWith(1, { name: 'Ники', isChild: true });
        expect(await screen.findByText('Възрастни: 2 · Деца: 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Дете')).not.toBeChecked();
        expect(screen.getByRole('button', { name: 'Ники е дете' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/В списъка има 1 дете, но все още няма детско меню/)).toBeInTheDocument();
    });

    it('marks an existing guest as a child', async () => {
        vi.mocked(api.setGuestIsChild).mockResolvedValue(guest(2, 'Петър Петров', null, true));
        const { user } = renderPage();
        const toggle = await screen.findByRole('button', { name: 'Петър Петров е дете' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await user.click(toggle);

        expect(api.setGuestIsChild).toHaveBeenCalledWith(1, 2, true);
        await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));
        expect(screen.getByText('Възрастни: 1 · Деца: 1')).toBeInTheDocument();
    });

    it('removes a guest from the list and from their group', async () => {
        vi.mocked(api.deleteGuest).mockResolvedValue(undefined);
        const { user } = renderPage();
        await user.click(await screen.findByRole('button', { name: 'Премахни Иван Иванов' }));

        expect(api.deleteGuest).toHaveBeenCalledWith(1, 1);
        await waitFor(() => expect(screen.queryByText('Иван Иванов')).not.toBeInTheDocument());
        expect(screen.getByRole('region', { name: 'Иванови' })).toBeInTheDocument();
    });

    it('shows the error when loading fails', async () => {
        vi.mocked(api.getEvent).mockRejectedValue(new Error('event not found'));
        renderPage();
        expect(await screen.findByText('event not found')).toBeInTheDocument();
    });

    it('offers to create an invitation when there is none', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        const { user, props } = renderPage();
        await user.click(await screen.findByRole('button', { name: 'Създай покана' }));
        expect(props.onEditInvitation).toHaveBeenCalled();
    });

    it('deletes the invitation after confirmation', async () => {
        vi.mocked(api.deleteForm).mockResolvedValue(undefined);
        const { user } = renderPage();
        await user.click(await screen.findByRole('button', { name: 'Изтрий' }));
        const dialog = await screen.findByRole('dialog', { name: 'Изтриване на покана' });
        await user.click(within(dialog).getByRole('button', { name: 'Изтрий' }));

        expect(api.deleteForm).toHaveBeenCalledWith('abc123');
        expect(await screen.findByText('Това събитие все още няма покана.')).toBeInTheDocument();
    });

    it('goes back to all events', async () => {
        const { user, props } = renderPage();
        await user.click(await screen.findByRole('button', { name: 'Всички събития' }));
        expect(props.onBack).toHaveBeenCalled();
    });
});
