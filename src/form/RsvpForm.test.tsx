import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GuestResponse } from '../../shared/types';
import { renderWithTheme } from '../test/render';
import RsvpForm from './RsvpForm';

const bothFields = { showName: true, showAnswer: true };

describe('RsvpForm', () => {
    it('cannot be sent until the name and answer are filled in', async () => {
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} onSubmit={vi.fn()} />);
        const send = screen.getByRole('button', { name: 'Изпрати' });
        expect(send).toBeDisabled();

        await user.type(screen.getByLabelText(/Вашето име/), 'Петър');
        expect(send).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        expect(send).toBeEnabled();
    });

    it('asks for confirmation with a summary before sending', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/Вашето име/), '  Петър ');
        await user.click(screen.getByRole('button', { name: 'Няма да присъствам' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Моля, проверете отговора си, преди да го изпратите.')).toBeInTheDocument();
        expect(within(dialog).getByText('Петър')).toBeInTheDocument();
        expect(within(dialog).getByText('Няма да присъства')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not send when the guest goes back from the confirmation', async () => {
        const onSubmit = vi.fn();
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/Вашето име/), 'Петър');
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Назад' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByLabelText(/Вашето име/)).toHaveValue('Петър');
    });

    it('sends the trimmed answer on confirmation and shows a success message', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/Вашето име/), '  Петър ');
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(onSubmit).toHaveBeenCalledWith({ name: 'Петър', answer: true });
        expect(await screen.findByText('Отговорът е изпратен успешно!')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
    });

    it('only sends the components the invitation asks for', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { user } = renderWithTheme(
            <RsvpForm fields={{ showName: false, showAnswer: true }} onSubmit={onSubmit} />,
        );
        expect(screen.queryByLabelText(/Вашето име/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Ще присъствам')).toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(onSubmit).toHaveBeenCalledWith({ answer: true });
    });

    it('shows the error and keeps the form when sending fails', async () => {
        const onSubmit = vi.fn().mockRejectedValue(new Error('please answer yes or no'));
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText(/Вашето име/), 'Петър');
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(await screen.findByText('please answer yes or no')).toBeInTheDocument();
        expect(screen.queryByText('Отговорът е изпратен успешно!')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeEnabled();
    });

    it('is a disabled preview without onSubmit', async () => {
        const { user } = renderWithTheme(<RsvpForm fields={bothFields} />);
        await user.type(screen.getByLabelText(/Вашето име/), 'Петър');
        await user.click(screen.getByRole('button', { name: 'Ще присъствам' }));
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeDisabled();
    });
});

const groupFields = { showName: true, showAnswer: true };
const guests = [
    { id: 1, name: 'Иван Иванов' },
    { id: 2, name: 'Мария Иванова' },
];

const answerFor = (name: string, label: string) =>
    within(screen.getByRole('group', { name: `Отговор за ${name}` })).getByRole('button', { name: label });

describe('RsvpForm for a group', () => {
    it('has the group members filled in, under a heading that is not their names', () => {
        renderWithTheme(
            <RsvpForm fields={groupFields} guests={guests} onSubmit={vi.fn()} />,
        );
        expect(screen.queryByText('Иван Иванов и Мария Иванова')).not.toBeInTheDocument();
        expect(screen.getByRole('heading')).toHaveTextContent('Отбележете своя отговор');
        expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
        expect(screen.getByText('Мария Иванова')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('needs an answer for every guest', async () => {
        const { user } = renderWithTheme(
            <RsvpForm fields={groupFields} guests={guests} onSubmit={vi.fn()} />,
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
            <RsvpForm fields={groupFields} guests={guests} onSubmit={onSubmit} />,
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
            <RsvpForm fields={groupFields} guests={guests} onSubmit={onSubmit} />,
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
            <RsvpForm
                fields={{ showName: true, showAnswer: false }}
               
                guests={guests}
               
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
            <RsvpForm fields={groupFields} guests={guests} onSubmit={onSubmit} />,
        );
        await user.click(answerFor('Иван Иванов', 'Ще присъства'));
        await user.click(answerFor('Мария Иванова', 'Ще присъства'));
        await user.click(screen.getByRole('button', { name: 'Изпрати' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

        expect(await screen.findByText('this invitation has already been answered')).toBeInTheDocument();
    });

    it('thanks the guests, with their answers locked, once the parent records the responses', async () => {
    const recorded = (answer: boolean): GuestResponse => ({
      respondedAt: '2026-11-19T10:00:00.000Z',
      answer,
      menuId: null,
      accommodation: null,
      transport: null,
    });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const props = { fields: groupFields, guests, onSubmit };
    const { user, rerender } = renderWithTheme(<RsvpForm {...props} />);
    await user.click(answerFor('Иван Иванов', 'Ще присъства'));
    await user.click(answerFor('Мария Иванова', 'Ще присъства'));
    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    rerender(<RsvpForm {...props} responses={{ 1: recorded(true), 2: recorded(true) }} />);
    expect(
      await screen.findByText(
        'Благодарим ви! Можете да преглеждате информацията по всяко време, както и своите отговори.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
  });

  it('shows the earlier answers selected and locked when the guests have already answered', () => {
    const recorded = (answer: boolean): GuestResponse => ({
      respondedAt: '2026-11-19T10:00:00.000Z',
      answer,
      menuId: null,
      accommodation: null,
      transport: null,
    });
    renderWithTheme(
      <RsvpForm fields={groupFields} guests={guests} responses={{ 1: recorded(true), 2: recorded(false) }} onSubmit={vi.fn()} />,
    );
    expect(answerFor('Иван Иванов', 'Ще присъства')).toHaveAttribute('aria-pressed', 'true');
    expect(answerFor('Мария Иванова', 'Няма да присъства')).toHaveAttribute('aria-pressed', 'true');
    expect(answerFor('Иван Иванов', 'Няма да присъства')).toBeDisabled();
    expect(answerFor('Мария Иванова', 'Ще присъства')).toBeDisabled();
    expect(screen.getByText(/Благодарим ви!/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
  });

  it('thanks a single guest informally', () => {
    const response: GuestResponse = {
      respondedAt: '2026-11-19T10:00:00.000Z',
      answer: true,
      menuId: null,
      accommodation: null,
      transport: null,
    };
    renderWithTheme(<RsvpForm fields={groupFields} guests={[guests[0]]} responses={{ 1: response }} />);
    expect(
      screen.getByText('Благодарим ти! Можеш да преглеждаш информацията по всяко време, както и своите отговори.'),
    ).toBeInTheDocument();
  });

  it('only sends the guests who have not answered yet', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const earlier: GuestResponse = {
      respondedAt: '2026-11-19T10:00:00.000Z',
      answer: true,
      menuId: null,
      accommodation: null,
      transport: null,
    };
    const { user } = renderWithTheme(
      <RsvpForm fields={groupFields} guests={guests} responses={{ 1: earlier }} onSubmit={onSubmit} />,
    );
    await user.click(answerFor('Мария Иванова', 'Ще присъства'));
    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));
    expect(onSubmit).toHaveBeenCalledWith([{ guestId: 2, answer: true }]);
  });

  it('cannot be sent when the group has no guests', () => {
        renderWithTheme(
            <RsvpForm fields={groupFields} guests={[]} onSubmit={vi.fn()} />,
        );
        expect(screen.getByText('В тази покана все още няма гости.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeDisabled();
    });

    it('cannot be sent as a preview', () => {
        renderWithTheme(<RsvpForm fields={groupFields} guests={guests} />);
        expect(screen.getByRole('button', { name: 'Изпрати' })).toBeDisabled();
    });
});
