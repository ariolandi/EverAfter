import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publishedForm, scheduleItem } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import RsvpForm from './RsvpForm';
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
                responseForm={<RsvpForm fields={form} guests={[{ id: 1, name: 'Петър Петров' }]} />}
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
        // Two on the cover, and one setting off the dress code on the schedule page.
        expect(rules).toHaveLength(3);
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
        // The cover's arrow is the first one on the page.
        await user.click(screen.getAllByRole('button', { name: 'Към следващата страница' })[0]);
        expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('asks the parent to move from the schedule page to the answer page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} page={1} onPageChange={onPageChange} />,
        );
        await user.click(screen.getAllByRole('button', { name: 'Към следващата страница' })[1]);
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('asks the parent to move back from the second page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} page={1} onPageChange={onPageChange} />,
        );
        await user.click(screen.getAllByRole('button', { name: 'Към предишната страница' })[0]);
        expect(onPageChange).toHaveBeenCalledWith(0);
    });

    it('asks the parent to move back from the answer page to the schedule page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderWithTheme(
            <InvitationForm fields={form} details={form} imageUrl={null} page={2} onPageChange={onPageChange} />,
        );
        await user.click(screen.getAllByRole('button', { name: 'Към предишната страница' })[1]);
        expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('scrolls to the page it is given', () => {
        const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');
        renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} page={1} />);
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
        scrollTo.mockRestore();
    });

    describe('schedule page', () => {
        const items = [
            scheduleItem({ id: 1, title: 'Церемония', startTime: '15:00', place: 'Градината' }),
            scheduleItem({ id: 2, title: 'Вечеря', startTime: '19:30', place: 'Ресторантът' }),
        ];

        it('lists the schedule with times in 24-hour format and places', () => {
            renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} schedule={items} />);
            expect(screen.getByRole('heading', { name: 'Програма' })).toBeInTheDocument();
            const [ceremony, dinner] = screen.getAllByRole('listitem').slice(0, 2);
            expect(ceremony).toHaveTextContent('15:00 · Церемония');
            expect(ceremony).toHaveTextContent('Градината');
            expect(dinner).toHaveTextContent('19:30 · Вечеря');
        });

        it('leaves out the schedule when the event has none', () => {
            renderWithTheme(<InvitationForm fields={form} details={form} imageUrl={null} />);
            expect(screen.queryByRole('heading', { name: 'Програма' })).not.toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Дрескод' })).toBeInTheDocument();
        });

        it.each([
            ['cocktail', 'коктейлно'],
            ['formal', 'официално'],
        ] as const)('shows a %s dress code', (dressCode, label) => {
            renderWithTheme(<InvitationForm fields={form} details={{ ...form, dressCode }} imageUrl={null} />);
            expect(screen.getByText(`Препоръчително е ${label} облекло`)).toBeInTheDocument();
        });

        it('shows the event colours', () => {
            const details = { ...form, colors: ['#111111', '#c9a227', '#ffffff'] };
            renderWithTheme(<InvitationForm fields={form} details={details} imageUrl={null} />);
            const swatches = within(screen.getByRole('list', { name: 'Цветове' })).getAllByRole('listitem');
            expect(swatches.map((s) => s.getAttribute('aria-label'))).toEqual(['#111111', '#c9a227', '#ffffff']);
            expect(swatches[1]).toHaveStyle({ backgroundColor: '#c9a227' });
        });

        it.each([
            ['mandatory', 'Моля, спазвайте цветовете на сватбата'],
            ['suggested', 'Ще се радваме, ако облеклото ви е в тези цветове'],
            ['informative', 'Цветовете на нашата сватба'],
        ] as const)('tells guests the colours are %s', (colorUsage, note) => {
            renderWithTheme(<InvitationForm fields={form} details={{ ...form, colorUsage }} imageUrl={null} />);
            expect(screen.getByText(note)).toBeInTheDocument();
        });
    });
});
