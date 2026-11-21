import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import InvitationForm from './InvitationForm';

const form = publishedForm();

describe('InvitationForm', () => {
    it('greets the guests in general, with the date in Bulgarian, the place and the couple', () => {
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} />);
        expect(screen.getByText('Скъпи')).toBeInTheDocument();
        expect(screen.getByText('гости')).toBeInTheDocument();
        expect(screen.getByText('имаме удоволствието да ви поканим на')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Сватба' })).toBeInTheDocument();
        expect(screen.getByText(/12 юни 2027/)).toBeInTheDocument();
        expect(screen.getByText('Пловдив')).toBeInTheDocument();
        expect(screen.getByText('Нека заедно отбележим празника!')).toBeInTheDocument();
        expect(screen.getByText('Мария & Иван')).toBeInTheDocument();
    });

    it('greets a group by first names in the plural', () => {
        renderWithTheme(
            <InvitationForm
                fields={form}
                details={form}
                imageUrl={null}
                guestNames={['Петър Петров', 'Елена Петрова', 'Ани']}
            />,
        );
        // Only the first names are used.
        expect(screen.getByText('Петър, Елена и Ани')).toBeInTheDocument();
        expect(screen.getByText(/да ви поканим/)).toBeInTheDocument();
    });

    it('addresses a single guest in the singular', () => {
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} guestNames={['Петър']} />);
        expect(screen.getByText('Петър')).toBeInTheDocument();
        expect(screen.getByText(/да те поканим/)).toBeInTheDocument();
    });

    it('leaves out blank names and an unset date', () => {
        renderWithTheme(
            <InvitationForm fields={form} details={{ ...form, groomName: ' ', weddingDate: '' }} imageUrl={null} />,
        );
        expect(screen.getByText('Мария')).toBeInTheDocument();
        expect(screen.queryByText(/2027/)).not.toBeInTheDocument();
    });

    it('shows the general answer form by default', () => {
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} onSubmit={vi.fn()} />);
        expect(screen.getByLabelText(/Вашето име/)).toBeInTheDocument();
    });

    it('shows a custom answer form in place of the general one', () => {
        renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} responseForm={<p>Формата на групата</p>} />,
        );
        expect(screen.getByText('Формата на групата')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Вашето име/)).not.toBeInTheDocument();
    });

    it('asks the parent to move to the next page when it controls the page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} page={0} onPageChange={onPageChange} />,
        );
        await user.click(screen.getByRole('button', { name: 'Към следващата страница' }));
        expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('asks the parent to move back from the second page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} page={1} onPageChange={onPageChange} />,
        );
        await user.click(screen.getByRole('button', { name: 'Към предишната страница' }));
        expect(onPageChange).toHaveBeenCalledWith(0);
    });

    it('scrolls to the page it is given', () => {
        const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} page={1} />);
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
        scrollTo.mockRestore();
    });
});
