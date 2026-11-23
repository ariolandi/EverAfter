import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GuestGroup } from '../../shared/types';
import { api } from '../api';
import { guest, guestGroup } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GuestGroupsPanel from './GuestGroupsPanel';

vi.mock('../api');

const guests = [guest(1, 'Иван Иванов'), guest(2, 'Мария Иванова'), guest(3, 'Петър Петров')];

/** Holds the groups like EventPage does, so the panel's changes show up. */
function Harness({ initial, hasInvitation = true }: { initial: GuestGroup[]; hasInvitation?: boolean }) {
    const [groups, setGroups] = useState(initial);
    return (
        <GuestGroupsPanel
            eventId={1}
            guests={guests}
            groups={groups}
            onGroupsChange={setGroups}
            hasInvitation={hasInvitation}
        />
    );
}

describe('GuestGroupsPanel', () => {
    it('shows each group with its guests, status and personal link', () => {
        renderWithTheme(
            <Harness
                initial={[
                    guestGroup({ id: 10, name: 'Иванови', token: 'tok-1', guestIds: [1, 2] }),
                    guestGroup({
                        id: 11,
                        name: 'Петрови',
                        token: 'tok-2',
                        guestIds: [3],
                        response: {
                            respondedAt: '2026-11-19T10:00:00.000Z',
                            guests: [{ guestId: 3, name: 'Петър Петров', answer: false, menuId: null }],
                        },
                    }),
                ]}
            />,
        );
        expect(screen.getByRole('heading', { name: 'Групи (2)' })).toBeInTheDocument();

        const ivanovi = screen.getByRole('region', { name: 'Иванови' });
        expect(within(ivanovi).getByText('Иван Иванов')).toBeInTheDocument();
        expect(within(ivanovi).getByText('Мария Иванова')).toBeInTheDocument();
        expect(within(ivanovi).getByText('Очаква отговор')).toBeInTheDocument();
        expect(within(ivanovi).getByLabelText('Връзка за групата')).toHaveValue(`${window.location.origin}/g/tok-1`);

        const petrovi = screen.getByRole('region', { name: 'Петрови' });
        expect(within(petrovi).getByText('Отговорили')).toBeInTheDocument();
        expect(within(petrovi).getByTitle('Няма да присъства')).toHaveTextContent('Петър Петров');
    });

    it('creates a group and moves the chosen guests out of their old group', async () => {
        vi.mocked(api.createGroup).mockResolvedValue(
            guestGroup({ id: 12, name: 'Ангелови', token: 'tok-3', guestIds: [2] }),
        );
        const { user } = renderWithTheme(<Harness initial={[guestGroup({ id: 10, name: 'Иванови', guestIds: [1, 2] })]} />);

        await user.click(screen.getByRole('button', { name: 'Нова група' }));
        await user.type(screen.getByLabelText(/Име на групата/), 'Ангелови');
        await user.click(screen.getByLabelText('Гости'));
        await user.click(await screen.findByRole('option', { name: 'Мария Иванова (в „Иванови“)' }));
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        expect(api.createGroup).toHaveBeenCalledWith(1, { name: 'Ангелови', guestIds: [2] });
        const created = await screen.findByRole('region', { name: 'Ангелови' });
        expect(within(created).getByText('Мария Иванова')).toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'Иванови' })).queryByText('Мария Иванова')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('edits a group', async () => {
        const group = guestGroup({ id: 10, name: 'Иванови', guestIds: [1] });
        vi.mocked(api.updateGroup).mockResolvedValue({ ...group, name: 'Семейство Иванови' });
        const { user } = renderWithTheme(<Harness initial={[group]} />);

        await user.click(screen.getByRole('button', { name: 'Редактирай Иванови' }));
        const name = screen.getByLabelText(/Име на групата/);
        await user.clear(name);
        await user.type(name, 'Семейство Иванови');
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        expect(api.updateGroup).toHaveBeenCalledWith(1, 10, { name: 'Семейство Иванови', guestIds: [1] });
        expect(await screen.findByRole('region', { name: 'Семейство Иванови' })).toBeInTheDocument();
    });

    it('deletes a group after confirmation', async () => {
        vi.mocked(api.deleteGroup).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<Harness initial={[guestGroup({ id: 10, name: 'Иванови', guestIds: [1] })]} />);

        await user.click(screen.getByRole('button', { name: 'Изтрий Иванови' }));
        const dialog = await screen.findByRole('dialog', { name: 'Изтриване на група' });
        expect(dialog).toHaveTextContent('Гостите остават в списъка.');
        await user.click(within(dialog).getByRole('button', { name: 'Изтрий' }));

        expect(api.deleteGroup).toHaveBeenCalledWith(1, 10);
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Иванови' })).not.toBeInTheDocument());
        expect(screen.getByText('Все още няма групи.')).toBeInTheDocument();
    });

    it('keeps the group and shows the error when deleting fails', async () => {
        vi.mocked(api.deleteGroup).mockRejectedValue(new Error('group not found'));
        const { user } = renderWithTheme(<Harness initial={[guestGroup({ id: 10, name: 'Иванови', guestIds: [1] })]} />);

        await user.click(screen.getByRole('button', { name: 'Изтрий Иванови' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Изтрий' }));

        expect(await screen.findByText('group not found')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Иванови', hidden: true })).toBeInTheDocument();
    });

    it('explains that links need a published invitation', () => {
        renderWithTheme(<Harness initial={[guestGroup({ guestIds: [1] })]} hasInvitation={false} />);
        expect(screen.getByText(/Връзките ще заработят, след като създадете покана/)).toBeInTheDocument();
    });

    it('cannot create a group before there are guests', () => {
        renderWithTheme(
            <GuestGroupsPanel eventId={1} guests={[]} groups={[]} onGroupsChange={vi.fn()} hasInvitation />,
        );
        expect(screen.getByRole('button', { name: 'Нова група' })).toBeDisabled();
        expect(screen.getByText('Добавете гости, за да създадете група.')).toBeInTheDocument();
    });
});
