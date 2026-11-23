import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupInvitation } from '../../shared/types';
import { api } from '../api';
import { menu, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GroupInvite from './GroupInvite';

vi.mock('../api');

const invitation = (overrides: Partial<GroupInvitation> = {}): GroupInvitation => ({
    form: publishedForm(),
    schedule: [],
    groupName: 'Семейство Иванови',
    guests: [
        { id: 1, name: 'Иван Иванов', isChild: false },
        { id: 2, name: 'Мария Иванова', isChild: false },
    ],
    menus: [],
    response: null,
    ...overrides,
});

describe('GroupInvite', () => {
    it('loads the group’s invitation by its token with the names filled in', async () => {
        vi.mocked(api.getGroupInvitation).mockResolvedValue(invitation());
        renderWithTheme(<GroupInvite token="grp-token" />);

        expect(await screen.findByText('Мария & Иван')).toBeInTheDocument();
        expect(api.getGroupInvitation).toHaveBeenCalledWith('grp-token');
        // Greeted by first name on the cover; each guest's full name heads their answer.
        expect(screen.getByText('Иван и Мария')).toBeInTheDocument();
        expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
        expect(screen.getByText('Мария Иванова')).toBeInTheDocument();
    });

    it('sends the answer, then shows the success message and the answer', async () => {
        vi.mocked(api.getGroupInvitation).mockResolvedValue(invitation());
        vi.mocked(api.submitGroupResponse).mockResolvedValue({
            respondedAt: '2026-11-19T10:00:00.000Z',
            guests: [
                { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null },
                { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null },
            ],
        });
        const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

        const ivan = await screen.findByRole('group', { name: 'Отговор за Иван Иванов' });
        await user.click(within(ivan).getByRole('button', { name: 'Ще присъства' }));
        const maria = screen.getByRole('group', { name: 'Отговор за Мария Иванова' });
        await user.click(within(maria).getByRole('button', { name: 'Няма да присъства' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(api.submitGroupResponse).toHaveBeenCalledWith('grp-token', {
            answers: [
                { guestId: 1, answer: true },
                { guestId: 2, answer: false },
            ],
        });
        expect(await screen.findByText('Отговорът е изпратен успешно!')).toBeInTheDocument();
        expect(screen.getByText('Вашият отговор')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
    });

    it('opens the recorded answer when the group has already answered', async () => {
        vi.mocked(api.getGroupInvitation).mockResolvedValue(
            invitation({
                response: {
                    respondedAt: '2026-11-19T10:00:00.000Z',
                    guests: [
                        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null },
                        { guestId: 2, name: 'Мария Иванова', answer: true, menuId: null },
                    ],
                },
            }),
        );
        renderWithTheme(<GroupInvite token="grp-token" />);

        expect(await screen.findByText(/Вече отговорихте на поканата/)).toBeInTheDocument();
        expect(screen.getAllByText('Ще присъства')).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
    });

    it('shows the menus page and lets only children pick the children’s menu', async () => {
        vi.mocked(api.getGroupInvitation).mockResolvedValue(
            invitation({
                guests: [
                    { id: 1, name: 'Иван Иванов', isChild: false },
                    { id: 2, name: 'Ники Иванов', isChild: true },
                ],
                menus: [menu(), menu({ id: 21, name: 'Детско меню', isChild: true })],
            }),
        );
        vi.mocked(api.submitGroupResponse).mockResolvedValue({
            respondedAt: '2026-11-19T10:00:00.000Z',
            guests: [],
        });
        const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

        // The menus page shows every menu with its dishes.
        expect((await screen.findAllByText('Шопска салата')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Детско меню').length).toBeGreaterThan(0);

        await user.click(screen.getByRole('combobox', { name: 'Меню за Иван Иванов' }));
        const adultOptions = within(await screen.findByRole('listbox')).getAllByRole('option');
        expect(adultOptions.map((o) => o.textContent)).toEqual(['Класическо меню']);
        await user.click(adultOptions[0]);

        await user.click(screen.getByRole('combobox', { name: 'Меню за Ники Иванов' }));
        const childOptions = within(await screen.findByRole('listbox')).getAllByRole('option');
        expect(childOptions.map((o) => o.textContent)).toEqual(['Класическо меню', 'Детско меню']);
        await user.click(childOptions[1]);

        for (const name of ['Иван Иванов', 'Ники Иванов']) {
            await user.click(
                within(screen.getByRole('group', { name: `Отговор за ${name}` })).getByRole('button', { name: 'Ще присъства' }),
            );
        }
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(api.submitGroupResponse).toHaveBeenCalledWith('grp-token', {
            answers: [
                { guestId: 1, answer: true, menuId: 20 },
                { guestId: 2, answer: true, menuId: 21 },
            ],
        });
    });

    it('shows the error when the link is unknown', async () => {
        vi.mocked(api.getGroupInvitation).mockRejectedValue(new Error('invitation not found'));
        renderWithTheme(<GroupInvite token="missing" />);
        expect(await screen.findByText('invitation not found')).toBeInTheDocument();
    });
});
