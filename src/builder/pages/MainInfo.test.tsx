import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormFields, InvitationDetails } from '../../../shared/types';
import { api } from '../../api';
import { renderWithTheme } from '../../test/render';
import MainInfo from './MainInfo';
import { todayIso } from '../../dates';

const blankDetails: InvitationDetails = {
    brideName: '',
    groomName: '',
    weddingDate: '',
    place: '',
    colors: ['#ffffff'],
    primaryColor: 0,
    secondaryColor: 0,
    invitationText: '',
    accommodationNotes: '',
    transportNotes: '',
    dressCode: 'cocktail',
    colorUsage: 'informative',
};

/** Holds the details like Builder does and prints them so the test can read the result. */
function Harness() {
    const [details, setDetails] = useState<InvitationDetails>({
        brideName: '',
        groomName: '',
        weddingDate: '',
        place: '',
        colors: ['#ffffff'],
        primaryColor: 0,
        secondaryColor: 0,
        invitationText: '',
        accommodationNotes: '',
        transportNotes: '',
        dressCode: 'cocktail',
        colorUsage: 'informative',
    });
    const [fields, setFields] = useState<FormFields>({ showName: true, showAnswer: true });
    return (
        <>
            <MainInfo details={details} setDetails={setDetails} fields={fields} setFields={setFields} />
            <output data-testid="details">{JSON.stringify(details)}</output>
        </>
    );
}

describe('MainInfo', () => {
    it('edits the couple, date, place, colours and text', async () => {
        const { user } = renderWithTheme(<Harness />);
        await user.type(screen.getByLabelText(/Булка/), 'Мария');
        await user.type(screen.getByLabelText(/Младоженец/), 'Иван');
        await user.type(screen.getByLabelText(/Дата на сватбата/), '12062027');
        expect(screen.getByLabelText(/Дата на сватбата/)).toHaveValue('12/06/2027');
        await user.type(screen.getByLabelText(/Място/), 'Пловдив');
        await user.click(screen.getByRole('button', { name: 'Добави цвят' }));
        await user.type(screen.getByLabelText('Текст на поканата'), 'Скъпи гости,{Enter}очакваме ви!');

        expect(JSON.parse(screen.getByTestId('details').textContent!)).toEqual({
            brideName: 'Мария',
            groomName: 'Иван',
            weddingDate: '2027-06-12',
            place: 'Пловдив',
            colors: ['#ffffff', '#ffffff'],
            // Adding a second colour gives it the secondary mark.
            primaryColor: 0,
            secondaryColor: 1,
            invitationText: 'Скъпи гости,\nочакваме ви!',
            accommodationNotes: '',
            transportNotes: '',
            dressCode: 'cocktail',
            colorUsage: 'informative',
        });
    });

    it('flags a date that does not exist and leaves it unset', async () => {
        const { user } = renderWithTheme(<Harness />);
        await user.type(screen.getByLabelText(/Дата на сватбата/), '31022027');
        expect(screen.getByText('Невалидна дата')).toBeInTheDocument();
        expect(JSON.parse(screen.getByTestId('details').textContent!).weddingDate).toBe('');
    });

    it('allows only future dates', async () => {
        const { user, container } = renderWithTheme(<Harness />);
        await user.type(screen.getByLabelText(/Дата на сватбата/), '01012020');
        expect(screen.getByText('Датата трябва да е в бъдещето')).toBeInTheDocument();
        expect(JSON.parse(screen.getByTestId('details').textContent!).weddingDate).toBe('');
        expect(container.querySelector('input[type="date"]')).toHaveAttribute('min', todayIso());
    });

    it('takes a date picked from the calendar', () => {
        const { container } = renderWithTheme(<Harness />);
        fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2027-06-12' } });
        expect(screen.getByLabelText(/Дата на сватбата/)).toHaveValue('12/06/2027');
        expect(JSON.parse(screen.getByTestId('details').textContent!).weddingDate).toBe('2027-06-12');
    });

    it('keeps the text plaque at a fixed height however long the text is', () => {
        renderWithTheme(<Harness />);
        const text = screen.getByLabelText('Текст на поканата');
        expect(text.tagName).toBe('TEXTAREA');
        // A plain textarea (not MUI's autosize one) so its height never follows the content.
        expect(text.style.height).toBe('');
        expect(text).toHaveAttribute('maxLength', '2000');
        expect(text).not.toBeRequired();
    });

    it('uploads a picture as the background and lets it be removed', async () => {
        const uploadImage = vi
            .spyOn(api, 'uploadImage')
            .mockResolvedValue({ id: 7, prompt: 'a.png', createdAt: '', url: '/api/images/7/file' })
        const onImageChange = vi.fn()
        const { user } = renderWithTheme(
            <MainInfo
                details={blankDetails}
                setDetails={vi.fn()}
                fields={{ showName: true, showAnswer: true }}
                setFields={vi.fn()}
                image={null}
                onImageChange={onImageChange}
            />,
        )
        const file = new File(['x'], 'a.png', { type: 'image/png' })
        await user.upload(screen.getByTestId('background-input'), file)
        expect(uploadImage).toHaveBeenCalledWith(file)
        expect(onImageChange).toHaveBeenCalledWith({ id: 7, url: '/api/images/7/file' })
    })

    it('refuses a file that is not a supported picture', async () => {
        const uploadImage = vi.spyOn(api, 'uploadImage')
        uploadImage.mockClear()
        const { user } = renderWithTheme(
            <MainInfo
                details={blankDetails}
                setDetails={vi.fn()}
                fields={{ showName: true, showAnswer: true }}
                setFields={vi.fn()}
                onImageChange={vi.fn()}
            />,
        )
        // applyAccept off: the hidden input's accept filter would otherwise drop the file before our check.
        await user.setup({ applyAccept: false }).upload(
            screen.getByTestId('background-input'),
            new File(['x'], 'a.gif', { type: 'image/gif' }),
        )
        expect(screen.getByText(/JPEG, PNG или WebP/)).toBeInTheDocument()
        expect(uploadImage).not.toHaveBeenCalled()
    })

    it('marks every field as required', () => {
        renderWithTheme(<Harness />);
        for (const label of [/Булка/, /Младоженец/, /Дата на сватбата/, /Място/]) {
            expect(screen.getByLabelText(label)).toBeRequired();
        }
    });
});
