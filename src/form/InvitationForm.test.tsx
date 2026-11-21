import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GroupRsvpForm from './GroupRsvpForm';
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
        expect(screen.getByText('Нека заедно отбележим този щастлив момент!')).toBeInTheDocument();
        expect(screen.getByText('Мария & Иван')).toBeInTheDocument();
    });

    it('writes its text in the primary colour', () => {
        const details = { ...form, colors: ['#111111', '#123456', '#654321'], primaryColor: 1, secondaryColor: 2 };
        renderWithTheme(<InvitationForm fields={form} details={details} imageUrl={null} guestNames={['Петър']} />);
        for (const text of ['Скъпи', 'Пловдив', 'Нека заедно отбележим този щастлив момент!']) {
            expect(screen.getByText(text)).toHaveStyle({ color: '#123456' });
        }
        // The guests' names are in the secondary colour.
        expect(screen.getByText('Петър')).toHaveStyle({ color: '#654321' });
    });

    it('keeps the primary and secondary colours on the answer page', () => {
        const details = { ...form, colors: ['#111111', '#123456', '#654321'], primaryColor: 1, secondaryColor: 2 };
        renderWithTheme(
            <InvitationForm
                fields={form}
                details={details}
                imageUrl={null}
                guestNames={['Петър']}
                responseForm={<GroupRsvpForm fields={form} guests={[{ id: 1, name: 'Петър Петров' }]} response={null} />}
            />,
        );
        expect(screen.getByText('Петър Петров')).toHaveStyle({ color: '#654321' });
    });

    it('sets the greeting, the guests, the date and the place in italics', () => {
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} />);
        expect(screen.getByText('гости')).toHaveStyle({ fontStyle: 'italic' });
        expect(screen.getByText(/12 юни 2027/)).toHaveStyle({ fontStyle: 'italic' });
        expect(screen.getByText('Пловдив')).toHaveStyle({ fontStyle: 'italic' });
        expect(screen.getByText('Скъпи')).toHaveStyle({ fontStyle: 'italic' });
        expect(screen.getByRole('heading', { name: 'Сватба' })).not.toHaveStyle({ fontStyle: 'italic' });
    });

    it('sets off the guests and the place with a gold rule each', () => {
        const { container } = renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} />);
        const rules = Array.from(container.querySelectorAll('hr'));
        expect(rules).toHaveLength(2);
        const [afterGuests, afterPlace] = rules;
        expect(afterGuests.previousElementSibling).toHaveTextContent('гости');
        expect(afterPlace.previousElementSibling).toHaveTextContent('Пловдив');
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
