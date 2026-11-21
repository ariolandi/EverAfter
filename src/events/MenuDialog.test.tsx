import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { menu } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import MenuDialog from './MenuDialog';

describe('MenuDialog', () => {
    it('creates a children’s menu once every course has a dish', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(<MenuDialog menu={null} onCancel={vi.fn()} onSave={onSave} />);
        expect(screen.getByRole('dialog', { name: 'Ново меню' })).toBeInTheDocument();
        const save = screen.getByRole('button', { name: 'Запази' });

        await user.type(screen.getByLabelText(/Име на менюто/), ' Детско меню ');
        await user.click(screen.getByLabelText('Детско меню'));
        await user.type(screen.getByLabelText(/Салата/), 'Доматена салата');
        await user.type(screen.getByLabelText(/Предястие/), 'Палачинки');
        expect(save).toBeDisabled();
        await user.type(screen.getByLabelText(/Основно ястие/), 'Пилешки хапки ');
        await user.click(save);

        expect(onSave).toHaveBeenCalledWith({
            name: 'Детско меню',
            isChild: true,
            salad: 'Доматена салата',
            appetizer: 'Палачинки',
            mainCourse: 'Пилешки хапки',
        });
    });

    it('starts from the menu being edited', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(<MenuDialog menu={menu()} onCancel={vi.fn()} onSave={onSave} />);
        expect(screen.getByRole('dialog', { name: 'Редактиране на меню' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Салата/)).toHaveValue('Шопска салата');
        expect(screen.getByLabelText('Детско меню')).not.toBeChecked();

        await user.clear(screen.getByLabelText(/Основно ястие/));
        await user.type(screen.getByLabelText(/Основно ястие/), 'Кавърма');
        await user.click(screen.getByRole('button', { name: 'Запази' }));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Класическо меню', mainCourse: 'Кавърма' }));
    });

    it('shows the error when saving fails', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error('salad must be 1-200 characters'));
        const { user } = renderWithTheme(<MenuDialog menu={menu()} onCancel={vi.fn()} onSave={onSave} />);
        await user.click(screen.getByRole('button', { name: 'Запази' }));
        expect(await screen.findByText('salad must be 1-200 characters')).toBeInTheDocument();
    });
});
