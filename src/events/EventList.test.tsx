import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { eventInfo, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import EventList from './EventList';

vi.mock('../api');

describe('EventList', () => {
    it('lists events with their guest count, invitation and co-owner status', async () => {
        vi.mocked(api.listEvents).mockResolvedValue([
            eventInfo({ id: 1, name: 'Сватба', guestCount: 12, invitation: publishedForm() }),
            eventInfo({ id: 2, name: 'Годеж', isOwner: false, ownerName: 'Ана' }),
        ]);
        renderWithTheme(<EventList onOpen={vi.fn()} />);

        expect(await screen.findByText('Сватба')).toBeInTheDocument();
        expect(screen.getByText('Гости: 12')).toBeInTheDocument();
        expect(screen.getByText('Има покана')).toBeInTheDocument();
        expect(screen.getByText('Няма покана')).toBeInTheDocument();
        expect(screen.getByText('Съорганизатор с Ана')).toBeInTheDocument();
        // Only the owner can delete an event.
        expect(screen.getByRole('button', { name: 'Изтрий Сватба' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Изтрий Годеж' })).not.toBeInTheDocument();
    });

    it('says when there are no events', async () => {
        vi.mocked(api.listEvents).mockResolvedValue([]);
        renderWithTheme(<EventList onOpen={vi.fn()} />);
        expect(await screen.findByText('Все още нямате събития.')).toBeInTheDocument();
    });

    it('opens an event', async () => {
        vi.mocked(api.listEvents).mockResolvedValue([eventInfo({ id: 7, name: 'Сватба' })]);
        const onOpen = vi.fn();
        const { user } = renderWithTheme(<EventList onOpen={onOpen} />);
        await user.click(await screen.findByText('Сватба'));
        expect(onOpen).toHaveBeenCalledWith(7);
    });

    it('creates an event and opens it', async () => {
        vi.mocked(api.listEvents).mockResolvedValue([]);
        vi.mocked(api.createEvent).mockResolvedValue(eventInfo({ id: 9, name: 'Нова' }));
        const onOpen = vi.fn();
        const { user } = renderWithTheme(<EventList onOpen={onOpen} />);
        await user.click(screen.getByRole('button', { name: 'Ново събитие' }));
        await user.type(await screen.findByLabelText(/Име на събитието/), ' Нова ');
        await user.click(screen.getByRole('button', { name: 'Създай' }));

        expect(api.createEvent).toHaveBeenCalledWith('Нова');
        await waitFor(() => expect(onOpen).toHaveBeenCalledWith(9));
    });

    it('deletes an event after confirmation', async () => {
        vi.mocked(api.listEvents).mockResolvedValue([eventInfo({ id: 1, name: 'Сватба' })]);
        vi.mocked(api.deleteEvent).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<EventList onOpen={vi.fn()} />);
        await user.click(await screen.findByRole('button', { name: 'Изтрий Сватба' }));
        const dialog = await screen.findByRole('dialog', { name: 'Изтриване на събитие' });
        expect(dialog).toHaveTextContent('„Сватба“');
        await user.click(within(dialog).getByRole('button', { name: 'Изтрий' }));

        expect(api.deleteEvent).toHaveBeenCalledWith(1);
        await waitFor(() => expect(screen.queryByText('Сватба')).not.toBeInTheDocument());
    });

    it('shows the error when loading fails', async () => {
        vi.mocked(api.listEvents).mockRejectedValue(new Error('not signed in'));
        renderWithTheme(<EventList onOpen={vi.fn()} />);
        expect(await screen.findByText('not signed in')).toBeInTheDocument();
    });
});
