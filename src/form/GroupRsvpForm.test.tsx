import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupResponse } from '../../shared/types';
import { renderWithTheme } from '../test/render';
import GroupRsvpForm from './GroupRsvpForm';

const fields = { showName: true, showAnswer: true };
const guests = [
    { id: 1, name: 'Иван Иванов' },
    { id: 2, name: 'Мария Иванова' },
];

const answerFor = (name: string, label: string) =>
    within(screen.getByRole('group', { name: `Отговор за ${name}` })).getByRole('button', { name: label });

describe('GroupRsvpForm', () => {
    it('shows the group name and its guests already filled in', () => {
        renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Семейство Иванови" guests={guests} response={null} onSubmit={vi.fn()} />,
        );
        expect(screen.getByText('Семейство Иванови')).toBeInTheDocument();
        expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
        expect(screen.getByText('Мария Иванова')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('needs an answer for every guest', async () => {
        const { user } = renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Семейство Иванови" guests={guests} response={null} onSubmit={vi.fn()} />,
        );
        const send = screen.getByRole('button', { name: 'Изпрати' });
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        expect(send).toBeDisabled();
        await user.click(answerFor('Мария Иванова', 'Няма да присъства'));
        expect(send).toBeEnabled();
        // Unselecting an answer makes the form incomplete again.
        await user.click(answerFor('Мария Иванова', 'Няма да присъства'));
        expect(send).toBeDisabled();
    });

    it('confirms each guest’s answer before sending and warns it cannot be changed', async () => {
        const onSubmit = vi.fn();
        const { user } = renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Семейство Иванови" guests={guests} response={null} onSubmit={onSubmit} />,
        );
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        await user.click(answerFor('Мария Иванова', 'Няма да присъства'));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));

        const dialog = await screen.findByRole('dialog');
        const items = within(dialog).getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Иван ИвановЩе присъства');
        expect(items[1]).toHaveTextContent('Мария ИвановаНяма да присъства');
        expect(within(dialog).getByText(/не може да бъде променян/)).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Назад' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('sends one answer per guest on confirmation', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Семейство Иванови" guests={guests} response={null} onSubmit={onSubmit} />,
        );
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        await user.click(answerFor('Мария Иванова', 'Няма да присъства'));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(onSubmit).toHaveBeenCalledWith([
            { guestId: 1, answer: true },
            { guestId: 2, answer: false },
        ]);
    });

    it('sends just the guests when the invitation does not ask whether they will come', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(
            <GroupRsvpForm
                fields={{ showName: true, showAnswer: false }}
                groupName="Семейство Иванови"
                guests={guests}
                response={null}
                onSubmit={onSubmit}
            />,
        );
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(onSubmit).toHaveBeenCalledWith([{ guestId: 1 }, { guestId: 2 }]);
    });

    it('shows the error when sending fails', async () => {
        const onSubmit = vi.fn().mockRejectedValue(new Error('this invitation has already been answered'));
        const { user } = renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Семейство Иванови" guests={guests} response={null} onSubmit={onSubmit} />,
        );
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        await user.click(answerFor('Мария Иванова', 'Ще присъства'));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(await screen.findByText('this invitation has already been answered')).toBeInTheDocument();
    });

    it('shows a success message with the answer once the parent records the response', async () => {
        const response: GroupResponse = {
            respondedAt: '2026-11-19T10:00:00.000Z',
            guests: [
                { guestId: 1, name: 'Иван Иванов', answer: true },
                { guestId: 2, name: 'Мария Иванова', answer: true },
            ],
        };
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const props = { fields, groupName: 'Семейство Иванови', guests, onSubmit };
        const { user, rerender } = renderWithTheme(<GroupRsvpForm {...props} response={null} />);
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        await user.click(answerFor('Мария Иванова', 'Ще присъства'));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalled());

        rerender(<GroupRsvpForm {...props} response={response} />);
        expect(await screen.findByText('Отговорът е изпратен успешно!')).toBeInTheDocument();
        expect(screen.getByText('Вашият отговор')).toBeInTheDocument();
    });

    it('shows the earlier answer instead of the form when the group has already answered', () => {
        renderWithTheme(
            <GroupRsvpForm
                fields={fields}
                groupName="Семейство Иванови"
                guests={guests}
                response={{
                    respondedAt: '2026-11-19T10:00:00.000Z',
                    guests: [
                        { guestId: 1, name: 'Иван Иванов', answer: true },
                        { guestId: 2, name: 'Мария Иванова', answer: false },
                    ],
                }}
                onSubmit={vi.fn()}
            />,
        );
        expect(screen.getByText(/Вече отговорихте на поканата/)).toBeInTheDocument();
        expect(screen.queryByText('Отговорът е изпратен успешно!')).not.toBeInTheDocument();
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Иван ИвановЩе присъства');
        expect(items[1]).toHaveTextContent('Мария ИвановаНяма да присъства');
        expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
    });

    it('cannot be sent when the group has no guests', () => {
        renderWithTheme(
            <GroupRsvpForm fields={fields} groupName="Празна" guests={[]} response={null} onSubmit={vi.fn()} />,
        );
        expect(screen.getByText('В тази покана все още няма гости.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeDisabled();
    });
});
