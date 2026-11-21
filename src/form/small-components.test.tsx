import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../test/render';
import { answerLabel } from './answers';
import ConfirmSubmitDialog from './ConfirmSubmitDialog';
import GroupAnswer from './GroupAnswer';
import ShareLinkField from '../components/ShareLinkField';
import SubmitSuccess from './SubmitSuccess';
import { groupShareUrlFor, shareUrlFor } from './shareUrl';

describe('ConfirmSubmitDialog', () => {
    const props = { open: true, submitting: false, onCancel: vi.fn(), onConfirm: vi.fn() };

    it('shows the summary and the note', () => {
        renderWithTheme(
            <ConfirmSubmitDialog {...props} note="Не може да се промени.">
                <p>Обобщение</p>
            </ConfirmSubmitDialog>,
        );
        expect(screen.getByRole('dialog', { name: 'Изпращане на отговора' })).toBeInTheDocument();
        expect(screen.getByText('Обобщение')).toBeInTheDocument();
        expect(screen.getByText('Не може да се промени.')).toBeInTheDocument();
    });

    it('confirms or cancels', async () => {
        const { user } = renderWithTheme(<ConfirmSubmitDialog {...props}>-</ConfirmSubmitDialog>);
        await user.click(screen.getByRole('button', { name: 'Потвърди и изпрати' }));
        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button', { name: 'Назад' }));
        expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables both buttons while sending', () => {
        renderWithTheme(
            <ConfirmSubmitDialog {...props} submitting>
                -
            </ConfirmSubmitDialog>,
        );
        expect(screen.getByRole('button', { name: 'Изпращане…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
    });

    it('renders nothing when closed', () => {
        renderWithTheme(
            <ConfirmSubmitDialog {...props} open={false}>
                -
            </ConfirmSubmitDialog>,
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('SubmitSuccess', () => {
    it('tells the guest the answer was sent', () => {
        renderWithTheme(<SubmitSuccess />);
        expect(screen.getByRole('status')).toHaveTextContent('Отговорът е изпратен успешно!');
    });
});

describe('GroupAnswer', () => {
    it('lists each guest with their answer', () => {
        renderWithTheme(
            <GroupAnswer
                guests={[
                    { name: 'Иван', answer: true },
                    { name: 'Мария', answer: false },
                    { name: 'Петър', answer: null },
                ]}
            />,
        );
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('ИванЩе присъства');
        expect(items[1]).toHaveTextContent('МарияНяма да присъства');
        expect(items[2]).toHaveTextContent(/^Петър$/);
    });
});

describe('ShareLinkField', () => {
    it('shows the link read-only and copies it', async () => {
        const { user } = renderWithTheme(<ShareLinkField url="https://example.test/g/abc" label="Връзка за групата" />);
        const field = screen.getByLabelText('Връзка за групата');
        expect(field).toHaveValue('https://example.test/g/abc');
        expect(field).toHaveAttribute('readonly');

        await user.click(screen.getByRole('button', { name: 'Copy link' }));
        expect(await navigator.clipboard.readText()).toBe('https://example.test/g/abc');
    });

    it('has a default label', () => {
        renderWithTheme(<ShareLinkField url="https://example.test/f/abc" />);
        expect(screen.getByLabelText('Share link')).toBeInTheDocument();
    });
});

describe('share URLs and labels', () => {
    it('builds the general and group links on the current origin', () => {
        expect(shareUrlFor('abc')).toBe(`${window.location.origin}/f/abc`);
        expect(groupShareUrlFor('xyz')).toBe(`${window.location.origin}/g/xyz`);
    });

    it('labels answers', () => {
        expect(answerLabel(true)).toBe('Ще присъства');
        expect(answerLabel(false)).toBe('Няма да присъства');
    });
});
