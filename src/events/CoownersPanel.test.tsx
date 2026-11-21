import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Coowner } from '../../shared/types';
import { api } from '../api';
import { eventInfo } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import CoownersPanel from './CoownersPanel';

vi.mock('../api');

const coowner = (id: number, email: string, name: string | null): Coowner => ({
    id,
    email,
    name,
    createdAt: '2026-11-01T10:00:00.000Z',
});

describe('CoownersPanel', () => {
    it('lists co-owners, with a note for those who have not signed in yet', async () => {
        vi.mocked(api.listCoowners).mockResolvedValue([
            coowner(1, 'ana@example.com', 'Ана'),
            coowner(2, 'new@example.com', null),
        ]);
        renderWithTheme(<CoownersPanel event={eventInfo()} />);

        expect(await screen.findByText('Ана')).toBeInTheDocument();
        expect(screen.getByText('ana@example.com')).toBeInTheDocument();
        expect(screen.getByText('new@example.com')).toBeInTheDocument();
        expect(screen.getByText('Още не е влизал(а) в EverAfter')).toBeInTheDocument();
    });

    it('lets the owner invite a co-owner', async () => {
        vi.mocked(api.listCoowners).mockResolvedValue([]);
        vi.mocked(api.addCoowner).mockResolvedValue(coowner(3, 'ivo@example.com', null));
        const { user } = renderWithTheme(<CoownersPanel event={eventInfo()} />);

        expect(await screen.findByText('Все още няма поканени съорганизатори.')).toBeInTheDocument();
        await user.type(screen.getByLabelText('Имейл'), 'ivo@example.com');
        await user.click(screen.getByRole('button', { name: 'Покани' }));

        expect(api.addCoowner).toHaveBeenCalledWith(1, 'ivo@example.com');
        expect(await screen.findByText('ivo@example.com')).toBeInTheDocument();
        expect(screen.getByLabelText('Имейл')).toHaveValue('');
    });

    it('lets the owner remove a co-owner', async () => {
        vi.mocked(api.listCoowners).mockResolvedValue([coowner(1, 'ana@example.com', 'Ана')]);
        vi.mocked(api.deleteCoowner).mockResolvedValue(undefined);
        const { user } = renderWithTheme(<CoownersPanel event={eventInfo()} />);

        await user.click(await screen.findByRole('button', { name: 'Премахни ana@example.com' }));
        expect(api.deleteCoowner).toHaveBeenCalledWith(1, 1);
        await waitFor(() => expect(screen.queryByText('Ана')).not.toBeInTheDocument());
    });

    it('shows the error when inviting fails', async () => {
        vi.mocked(api.listCoowners).mockResolvedValue([]);
        vi.mocked(api.addCoowner).mockRejectedValue(new Error('this person is already a co-owner'));
        const { user } = renderWithTheme(<CoownersPanel event={eventInfo()} />);
        await user.type(screen.getByLabelText('Имейл'), 'ana@example.com');
        await user.click(screen.getByRole('button', { name: 'Покани' }));
        expect(await screen.findByText('this person is already a co-owner')).toBeInTheDocument();
    });

    it('shows co-owners who the owner is, without invite or remove controls', async () => {
        vi.mocked(api.listCoowners).mockResolvedValue([coowner(1, 'ana@example.com', 'Ана')]);
        renderWithTheme(<CoownersPanel event={eventInfo({ isOwner: false, ownerName: 'Мария' })} />);

        expect(await screen.findByText('Ана')).toBeInTheDocument();
        expect(screen.getByText('Организатор: Мария')).toBeInTheDocument();
        expect(screen.queryByLabelText('Имейл')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Премахни/ })).not.toBeInTheDocument();
    });
});
