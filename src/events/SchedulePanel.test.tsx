import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { scheduleItem } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import SchedulePanel from './SchedulePanel';

vi.mock('../api');

const dinner = scheduleItem({ id: 31, title: 'Вечеря', startTime: '19:30', place: 'Ресторант' });

describe('SchedulePanel', () => {
    beforeEach(() => {
        vi.mocked(api.listSchedule).mockResolvedValue([scheduleItem()]);
    });

    it('lists the parts with their starting hour and place', async () => {
        renderWithTheme(<SchedulePanel eventId={1} />);
        const ceremony = await screen.findByRole('region', { name: 'Церемония' });
        expect(api.listSchedule).toHaveBeenCalledWith(1);
        expect(ceremony).toHaveTextContent('15:00 · Градината на хотела');
    });

    it('adds a part in chronological order', async () => {
        vi.mocked(api.createScheduleItem).mockResolvedValue(scheduleItem({ id: 32, title: 'Коктейл', startTime: '14:00' }));
        const { user } = renderWithTheme(<SchedulePanel eventId={1} />);
        await screen.findByRole('region', { name: 'Церемония' });
        await user.click(screen.getByRole('button', { name: 'Нова част' }));
        const dialog = screen.getByRole('dialog', { name: 'Нова част от програмата' });
        const save = within(dialog).getByRole('button', { name: 'Запази' });
        await user.type(within(dialog).getByLabelText(/Заглавие/), ' Коктейл ');
        await user.type(within(dialog).getByLabelText(/Начален час/), '1400');
        expect(within(dialog).getByLabelText(/Начален час/)).toHaveValue('14:00');
        await user.type(within(dialog).getByLabelText(/Място/), 'Терасата');
        await user.click(save);

        expect(api.createScheduleItem).toHaveBeenCalledWith(1, { title: 'Коктейл', startTime: '14:00', place: 'Терасата' });
        await screen.findByRole('region', { name: 'Коктейл' });
        expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Коктейл', 'Церемония']);
    });

    it('edits a part and moves it by its new hour', async () => {
        vi.mocked(api.listSchedule).mockResolvedValue([scheduleItem(), dinner]);
        vi.mocked(api.updateScheduleItem).mockResolvedValue(scheduleItem({ startTime: '21:00' }));
        const { user } = renderWithTheme(<SchedulePanel eventId={1} />);
        await user.click(await screen.findByRole('button', { name: 'Редактирай Церемония' }));
        expect(screen.getByLabelText(/Начален час/)).toHaveValue('15:00');
        await user.clear(screen.getByLabelText(/Начален час/));
        await user.type(screen.getByLabelText(/Начален час/), '2100');
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        expect(api.updateScheduleItem).toHaveBeenCalledWith(1, 30, expect.objectContaining({ startTime: '21:00' }));
        await waitFor(() =>
            expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Вечеря', 'Церемония']),
        );
    });

    it('deletes a part after confirmation', async () => {
        vi.mocked(api.deleteScheduleItem).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<SchedulePanel eventId={1} />);
        await user.click(await screen.findByRole('button', { name: 'Изтрий Церемония' }));
        const dialog = await screen.findByRole('dialog', { name: 'Изтриване на част от програмата' });
        await user.click(within(dialog).getByRole('button', { name: 'Изтрий' }));

        expect(api.deleteScheduleItem).toHaveBeenCalledWith(1, 30);
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Церемония' })).not.toBeInTheDocument());
        expect(screen.getByText('Все още няма добавена програма.')).toBeInTheDocument();
    });
});

describe('ScheduleDialog time', () => {
    it('is typed in 24-hour time with the colon added', async () => {
        const { user } = renderWithTheme(<SchedulePanel eventId={1} />);
        await user.click(await screen.findByRole('button', { name: 'Нова част' }));
        const time = screen.getByLabelText(/Начален час/);
        await user.type(time, '1930');
        expect(time).toHaveValue('19:30');
        expect(screen.getByRole('button', { name: 'Избери час' })).toBeInTheDocument();
    });

    it('rejects an hour outside 24-hour time', async () => {
        const { user } = renderWithTheme(<SchedulePanel eventId={1} />);
        await user.click(await screen.findByRole('button', { name: 'Нова част' }));
        const dialog = screen.getByRole('dialog');
        await user.type(within(dialog).getByLabelText(/Заглавие/), 'Танци');
        await user.type(within(dialog).getByLabelText(/Място/), 'Залата');
        await user.type(within(dialog).getByLabelText(/Начален час/), '2530');
        expect(within(dialog).getByText('Невалиден час')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Запази' })).toBeDisabled();
    });
});
