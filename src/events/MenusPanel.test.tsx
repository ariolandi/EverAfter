import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { menu } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import MenusPanel from './MenusPanel';

vi.mock('../api');

const kids = menu({ id: 21, name: 'Детско меню', isChild: true, mainCourse: 'Пилешки хапки' });

describe('MenusPanel', () => {
    beforeEach(() => {
        vi.mocked(api.listMenus).mockResolvedValue([menu()]);
    });

    it('lists the menus with their courses', async () => {
        renderWithTheme(<MenusPanel eventId={1} childCount={0} />);
        const classic = await screen.findByRole('region', { name: 'Класическо меню' });
        expect(api.listMenus).toHaveBeenCalledWith(1);
        expect(classic).toHaveTextContent('СалатаШопска салата');
        expect(classic).toHaveTextContent('ПредястиеПълнени чушки');
        expect(classic).toHaveTextContent('Основно ястиеСвинско с картофи');
    });

    it('points out that children have no menu yet', async () => {
        renderWithTheme(<MenusPanel eventId={1} childCount={2} />);
        expect(await screen.findByText(/В списъка има 2 деца, но все още няма детско меню/)).toBeInTheDocument();
    });

    it('adds a children’s menu after the adults’ ones', async () => {
        vi.mocked(api.createMenu).mockResolvedValue(kids);
        const { user } = renderWithTheme(<MenusPanel eventId={1} childCount={1} />);
        await screen.findByRole('region', { name: 'Класическо меню' });
        await user.click(screen.getByRole('button', { name: 'Ново меню' }));
        const dialog = screen.getByRole('dialog', { name: 'Ново меню' });
        await user.type(within(dialog).getByLabelText(/Име на менюто/), 'Детско меню');
        await user.click(within(dialog).getByLabelText('Детско меню'));
        await user.type(within(dialog).getByLabelText(/Салата/), 'Шопска салата');
        await user.type(within(dialog).getByLabelText(/Предястие/), 'Пълнени чушки');
        await user.type(within(dialog).getByLabelText(/Основно ястие/), 'Пилешки хапки');
        await user.click(within(dialog).getByRole('button', { name: 'Запази' }));

        expect(api.createMenu).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Детско меню', isChild: true }));
        const kidsMenu = await screen.findByRole('region', { name: 'Детско меню' });
        expect(within(kidsMenu).getByText('Детско')).toBeInTheDocument();
        expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
            'Класическо меню',
            'Детско меню',
        ]);
        expect(screen.queryByText(/все още няма детско меню/)).not.toBeInTheDocument();
    });

    it('edits a menu', async () => {
        vi.mocked(api.updateMenu).mockResolvedValue(menu({ mainCourse: 'Кавърма' }));
        const { user } = renderWithTheme(<MenusPanel eventId={1} childCount={0} />);
        await user.click(await screen.findByRole('button', { name: 'Редактирай Класическо меню' }));
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        expect(api.updateMenu).toHaveBeenCalledWith(1, 20, expect.objectContaining({ salad: 'Шопска салата' }));
        expect(await screen.findByText('Кавърма')).toBeInTheDocument();
    });

    it('deletes a menu after confirmation', async () => {
        vi.mocked(api.deleteMenu).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<MenusPanel eventId={1} childCount={0} />);
        await user.click(await screen.findByRole('button', { name: 'Изтрий Класическо меню' }));
        const dialog = await screen.findByRole('dialog', { name: 'Изтриване на меню' });
        await user.click(within(dialog).getByRole('button', { name: 'Изтрий' }));

        expect(api.deleteMenu).toHaveBeenCalledWith(1, 20);
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Класическо меню' })).not.toBeInTheDocument());
        expect(screen.getByText('Все още няма менюта.')).toBeInTheDocument();
    });
});
