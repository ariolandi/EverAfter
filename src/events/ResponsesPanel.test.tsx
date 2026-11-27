import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseEntry } from '../../shared/types';
import { api } from '../api';
import { guest, menu, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import ResponsesPanel from './ResponsesPanel';

vi.mock('../api');

const guests = [guest(1, 'Иван Иванов'), guest(2, 'Ники Иванов', null, true), guest(3, 'Мария Иванова')];

const entries: ResponseEntry[] = [
    {
        guestId: 1,
        generalResponseId: null,
        name: 'Иван Иванов',
        groupName: 'Иванови',
        response: {
            respondedAt: '2026-11-19T10:00:00.000Z',
            answer: true,
            menuId: 20,
            accommodation: true,
            transport: 'needsHelp',
        },
    },
    {
        guestId: 2,
        generalResponseId: null,
        name: 'Ники Иванов',
        groupName: 'Иванови',
        response: {
            respondedAt: '2026-11-19T10:00:00.000Z',
            answer: false,
            menuId: null,
            accommodation: null,
            transport: null,
        },
    },
    { guestId: 3, generalResponseId: null, name: 'Мария Иванова', groupName: null, response: null },
    {
        guestId: null,
        generalResponseId: 7,
        name: 'Петър Петров',
        groupName: null,
        response: {
            respondedAt: '2026-11-20T10:00:00.000Z',
            answer: true,
            menuId: null,
            accommodation: null,
            transport: null,
        },
    },
];

const renderPanel = (invitation = publishedForm()) =>
    renderWithTheme(<ResponsesPanel eventId={1} guests={guests} invitation={invitation} />);

describe('ResponsesPanel', () => {
    beforeEach(() => {
        vi.mocked(api.listResponses).mockResolvedValue(entries);
        vi.mocked(api.listMenus).mockResolvedValue([menu(), menu({ id: 21, name: 'Детско меню', isChild: true })]);
        vi.mocked(api.saveGuestResponse).mockResolvedValue(undefined);
    });

    it('lists every guest’s answer in a table', async () => {
        renderPanel();
        expect(await screen.findByRole('heading', { name: 'Отговори (3 от 4)' })).toBeInTheDocument();

        const rows = within(screen.getByRole('table', { name: 'Отговори на гостите' })).getAllByRole('row');
        const ivan = within(rows.find((r) => within(r).queryByText('Иван Иванов'))!);
        expect(ivan.getByText('Иванови')).toBeInTheDocument();
        expect(ivan.getByText('Ще присъства')).toBeInTheDocument();
        expect(ivan.getByText('Класическо меню')).toBeInTheDocument();
        expect(ivan.getByText('Да')).toBeInTheDocument();
        expect(ivan.getByText('Иска помощ')).toBeInTheDocument();

        const niki = rows.find((r) => within(r).queryByText('Ники Иванов'))!;
        expect(within(niki).getByText('Няма да присъства')).toBeInTheDocument();
        const maria = rows.find((r) => within(r).queryByText('Мария Иванова'))!;
        expect(within(maria).getByText('Очаква отговор')).toBeInTheDocument();
        // Answers sent from the general link are listed too, with no invitation to open, but their answer can be corrected.
        const petar = rows.find((r) => within(r).queryByText('Петър Петров'))!;
        expect(within(petar).getByText('Ще присъства')).toBeInTheDocument();
        expect(within(petar).queryByRole('link')).not.toBeInTheDocument();
        expect(within(petar).getByRole('button', { name: 'Редактирай отговора на Петър Петров' })).toBeInTheDocument();
    });

    it('opens a guest’s own invitation to preview it', async () => {
        renderPanel();
        const link = await screen.findByRole('link', { name: 'Отвори поканата на Иван Иванов' });
        expect(link).toHaveAttribute('href', `${window.location.origin}/i/guest-token-1`);
    });

    it('records an answer for a guest who has not answered', async () => {
        const { user } = renderPanel();
        await user.click(await screen.findByRole('button', { name: 'Редактирай отговора на Мария Иванова' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'Запази' })).toBeDisabled();
        await user.click(within(dialog).getByRole('button', { name: 'Ще присъствам' }));
        await user.click(within(dialog).getByRole('combobox', { name: 'Меню' }));
        // An adult is offered the adults’ menu only.
        expect(within(await screen.findByRole('listbox')).getAllByRole('option')).toHaveLength(1);
        await user.click(screen.getByRole('option', { name: 'Класическо меню' }));
        await user.click(within(dialog).getByRole('button', { name: 'Няма да се възползвам' }));
        await user.click(within(dialog).getByRole('button', { name: 'Имам собствен превоз' }));
        await user.click(within(dialog).getByRole('button', { name: 'Запази' }));

        expect(api.saveGuestResponse).toHaveBeenCalledWith(1, 3, {
            answer: true,
            menuId: 20,
            accommodation: false,
            roomWith: '',
            notes: '',
            transport: 'own',
        });
        expect(api.listResponses).toHaveBeenCalledTimes(2);
    });

    it('changes a guest’s answer to “not coming” without the other choices', async () => {
        const { user } = renderPanel();
        await user.click(await screen.findByRole('button', { name: 'Редактирай отговора на Иван Иванов' }));

        const dialog = await screen.findByRole('dialog');
        // It starts from what the guest answered.
        expect(within(dialog).getByRole('button', { name: 'Ще присъствам' })).toHaveAttribute('aria-pressed', 'true');
        await user.click(within(dialog).getByRole('button', { name: 'Няма да присъствам' }));
        expect(within(dialog).queryByRole('combobox', { name: 'Меню' })).not.toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: 'Запази' }));

        expect(api.saveGuestResponse).toHaveBeenCalledWith(1, 1, { answer: false });
    });

    it('cannot record answers until the event has an invitation', async () => {
        renderWithTheme(<ResponsesPanel eventId={1} guests={guests} invitation={null} />);
        expect(await screen.findByRole('button', { name: 'Редактирай отговора на Иван Иванов' })).toBeDisabled();
    });
});
