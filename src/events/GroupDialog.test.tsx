import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { guest, guestGroup } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GroupDialog from './GroupDialog';

const guests = [guest(1, 'Иван Иванов'), guest(2, 'Мария Иванова'), guest(3, 'Петър Петров')];

describe('GroupDialog', () => {
    it('creates a group from a name and the chosen guests', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(
            <GroupDialog group={null} guests={guests} groups={[]} onCancel={vi.fn()} onSave={onSave} />,
        );
        expect(screen.getByRole('dialog', { name: 'Нова група' })).toBeInTheDocument();
        const save = screen.getByRole('button', { name: 'Запази' });
        expect(save).toBeDisabled();

        await user.type(screen.getByLabelText(/Име на групата/), '  Семейство Иванови ');
        expect(save).toBeDisabled();
        await user.click(screen.getByLabelText('Гости'));
        await user.click(await screen.findByRole('option', { name: 'Иван Иванов' }));
        await user.click(screen.getByLabelText('Гости'));
        await user.click(await screen.findByRole('option', { name: 'Мария Иванова' }));
        await user.click(save);

        expect(onSave).toHaveBeenCalledWith({ name: 'Семейство Иванови', guestIds: [1, 2] });
    });

    it('starts from the group being edited', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const group = guestGroup({ id: 10, name: 'Иванови', guestIds: [1, 2] });
        const { user } = renderWithTheme(
            <GroupDialog group={group} guests={guests} groups={[group]} onCancel={vi.fn()} onSave={onSave} />,
        );
        expect(screen.getByRole('dialog', { name: 'Редактиране на група' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Име на групата/)).toHaveValue('Иванови');
        expect(screen.getByRole('button', { name: 'Иван Иванов' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Мария Иванова' })).toBeInTheDocument();

        // Removing a chosen guest uses the chip's delete icon.
        const chip = screen.getByRole('button', { name: 'Мария Иванова' });
        await user.click(chip.querySelector('svg')!);
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        expect(onSave).toHaveBeenCalledWith({ name: 'Иванови', guestIds: [1] });
    });

    it('marks guests who are already in another group', async () => {
        const other = guestGroup({ id: 11, name: 'Петрови', guestIds: [3] });
        const { user } = renderWithTheme(
            <GroupDialog group={null} guests={guests} groups={[other]} onCancel={vi.fn()} onSave={vi.fn()} />,
        );
        await user.click(screen.getByLabelText('Гости'));
        expect(await screen.findByRole('option', { name: 'Петър Петров (в „Петрови“)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Иван Иванов' })).toBeInTheDocument();
    });

    it('shows the error when saving fails and lets the user try again', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error('guest not found'));
        const group = guestGroup({ guestIds: [1] });
        const { user } = renderWithTheme(
            <GroupDialog group={group} guests={guests} groups={[group]} onCancel={vi.fn()} onSave={onSave} />,
        );
        await user.click(screen.getByRole('button', { name: 'Запази' }));
        expect(await screen.findByText('guest not found')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Запази' })).toBeEnabled();
    });

    it('cancels', async () => {
        const onCancel = vi.fn();
        const { user } = renderWithTheme(
            <GroupDialog group={null} guests={guests} groups={[]} onCancel={onCancel} onSave={vi.fn()} />,
        );
        await user.click(screen.getByRole('button', { name: 'Отказ' }));
        expect(onCancel).toHaveBeenCalled();
    });
});
