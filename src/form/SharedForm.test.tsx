import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import SharedForm from './SharedForm';

vi.mock('../api');

describe('SharedForm', () => {
    it('loads the invitation by slug', async () => {
        vi.mocked(api.getForm).mockResolvedValue({ ...publishedForm(), eventName: 'Сватба', schedule: [], menus: [] });
        renderWithTheme(<SharedForm slug="abc123" />);

        expect(await screen.findByText('Мария & Иван')).toBeInTheDocument();
        expect(api.getForm).toHaveBeenCalledWith('abc123');
        expect(screen.getByText('Пловдив')).toBeInTheDocument();
    });

    it('confirms and sends the answer for the slug, then thanks the guest', async () => {
        vi.mocked(api.getForm).mockResolvedValue({ ...publishedForm(), eventName: 'Сватба', schedule: [], menus: [] });
        vi.mocked(api.submitFormResponse).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<SharedForm slug="abc123" />);

        await user.type(await screen.findByLabelText(/Вашето име/), 'Петър');
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        await user.click(
            within(screen.getByRole('group', { name: 'Нощувка за Петър' })).getByRole('button', { name: 'Няма да се възползвам' }),
        );
        await user.click(
            within(screen.getByRole('group', { name: 'Собствен превоз за Петър' })).getByRole('button', {
                name: 'Имам собствен превоз',
            }),
        );
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(api.submitFormResponse).toHaveBeenCalledWith('abc123', {
            name: 'Петър',
            answer: true,
            accommodation: false,
            transport: 'own',
        });
        expect(await screen.findByText('Отговорът е изпратен успешно!')).toBeInTheDocument();
    });

    it('shows the error when the invitation does not exist', async () => {
        vi.mocked(api.getForm).mockRejectedValue(new Error('form not found'));
        renderWithTheme(<SharedForm slug="missing" />);
        expect(await screen.findByText('form not found')).toBeInTheDocument();
    });
});
