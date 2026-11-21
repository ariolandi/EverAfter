import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
        expect(within(dialog).getByText('Ще присъства')).toBeInTheDocument();
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
