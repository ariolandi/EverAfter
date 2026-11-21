import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Guest, GuestGroup } from '../../shared/types';
import { api } from '../api';
import { eventInfo, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import Builder from './Builder';

vi.mock('../api');

const guest = (id: number, name: string): Guest => ({
    id,
    name,
    groupId: null,
    isChild: false,
    createdAt: '2026-11-01T10:00:00.000Z',
});

const group = (id: number, name: string, guestIds: number[]): GuestGroup => ({
    id,
    name,
    token: `token-${id}`,
    guestIds,
    response: null,
    createdAt: '2026-11-01T10:00:00.000Z',
});

describe('Builder', () => {
    beforeEach(() => {
        vi.mocked(api.listGuests).mockResolvedValue([]);
        vi.mocked(api.listGroups).mockResolvedValue([]);
    });

    it('publishes a new invitation once the details are filled in', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        vi.mocked(api.publishForm).mockResolvedValue(publishedForm());
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        expect(await screen.findByRole('heading', { name: 'Създай своята покана' })).toBeInTheDocument();
        const save = screen.getByRole('button', { name: 'Запази' });
        expect(save).toBeDisabled();

        await user.type(screen.getByLabelText(/Булка/), 'Мария');
        await user.type(screen.getByLabelText(/Младоженец/), 'Иван');
        await user.type(screen.getByLabelText(/Дата на сватбата/), '12062027');
        await user.type(screen.getByLabelText(/Място/), 'Пловдив');
        await user.click(save);

        expect(api.publishForm).toHaveBeenCalledWith(
            1,
            null,
            { showName: true, showAnswer: true },
            { brideName: 'Мария', groomName: 'Иван', weddingDate: '2027-06-12', place: 'Пловдив', colors: ['#ffffff'], invitationText: '' },
        );
        expect(await screen.findByText('Поканата е запазена')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Редактирай поканата' })).toBeInTheDocument();
    });

    it('loads and updates an existing invitation', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(
            eventInfo({ invitation: publishedForm({ imageId: 99, imageUrl: '/api/forms/abc123/image' }) }),
        );
        vi.mocked(api.updateForm).mockResolvedValue(publishedForm({ place: 'София' }));
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        expect(await screen.findByRole('heading', { name: 'Редактирай поканата' })).toBeInTheDocument();
        const place = screen.getByLabelText(/Място/);
        expect(place).toHaveValue('Пловдив');
        await user.clear(place);
        await user.type(place, 'София');
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        // The saved image is kept.
        expect(api.updateForm).toHaveBeenCalledWith(
            'abc123',
            99,
            { showName: true, showAnswer: true },
            expect.objectContaining({ place: 'София' }),
        );
    });

    it('saves and moves to the guests step with Напред', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.updateForm).mockResolvedValue(publishedForm());
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        await user.click(await screen.findByRole('button', { name: 'Напред' }));
        expect(api.updateForm).toHaveBeenCalled();
        expect(await screen.findByText(/Все още няма групи гости/)).toBeInTheDocument();
    });

    it('previews the invitation of the guest group picked on the guests step', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.listGuests).mockResolvedValue([
            guest(1, 'Иван'),
            guest(2, 'Мария'),
            guest(3, 'Петър'),
        ]);
        vi.mocked(api.listGroups).mockResolvedValue([
            group(10, 'Семейство Иванови', [1, 2]),
            group(11, 'Приятели', [3]),
        ]);
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        await user.click(await screen.findByRole('tab', { name: /Гости/ }));
        expect(screen.queryByLabelText('Describe the image')).not.toBeInTheDocument();
        // The first group is previewed: it is selected in the list and fills in the answer form.
        expect(screen.getByRole('button', { name: /Иван и Мария/ })).toHaveClass('Mui-selected');
        expect(screen.getByRole('group', { name: 'Отговор за Иван' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Петър/ }));
        expect(screen.getByRole('group', { name: 'Отговор за Петър' })).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Отговор за Иван' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeDisabled();
    });

    it('picks the greeted group on the first step', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.listGuests).mockResolvedValue([guest(1, 'Иван Иванов'), guest(2, 'Петър Петров')]);
        vi.mocked(api.listGroups).mockResolvedValue([
            group(10, 'Семейство Иванови', [1]),
            group(11, 'Приятели', [2]),
        ]);
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        // The first group is greeted by default, by first name.
        expect(await screen.findByText('Иван')).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Покана за' }));
        await user.click(screen.getByRole('option', { name: /Петър Петров/ }));
        expect(screen.getByText('Петър')).toBeInTheDocument();
        expect(screen.queryByText('Иван')).not.toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Покана за' }));
        await user.click(screen.getByRole('option', { name: /обща покана/ }));
        expect(screen.getByText('гости')).toBeInTheDocument();
    });

    it('shows the error when loading fails', async () => {
        vi.mocked(api.getEvent).mockRejectedValue(new Error('not signed in'));
        renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);
        expect(await screen.findByText('not signed in')).toBeInTheDocument();
    });

    it('goes back to the event', async () => {
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        const onBack = vi.fn();
        const { user } = renderWithTheme(<Builder eventId={1} onBack={onBack} />);
        await user.click(await screen.findByRole('button', { name: 'Към събитието' }));
        expect(onBack).toHaveBeenCalled();
    });
});
