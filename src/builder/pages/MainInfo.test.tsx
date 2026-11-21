import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FormFields, InvitationDetails } from '../../../shared/types';
import { renderWithTheme } from '../../test/render';
import MainInfo from './MainInfo';

/** Holds the details like Builder does and prints them so the test can read the result. */
function Harness() {
    const [details, setDetails] = useState<InvitationDetails>({
        brideName: '',
        groomName: '',
        weddingDate: '',
        place: '',
        colors: ['#ffffff'],
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
    it('edits the couple, date, place and colours', async () => {
        const { user } = renderWithTheme(<Harness />);
        await user.type(screen.getByLabelText(/Булка/), 'Мария');
        await user.type(screen.getByLabelText(/Младоженец/), 'Иван');
        fireEvent.change(screen.getByLabelText(/Дата на сватбата/), { target: { value: '2027-06-12' } });
        await user.type(screen.getByLabelText(/Място/), 'Пловдив');
        await user.click(screen.getByRole('button', { name: 'Добави цвят' }));

        expect(JSON.parse(screen.getByTestId('details').textContent!)).toEqual({
            brideName: 'Мария',
            groomName: 'Иван',
            weddingDate: '2027-06-12',
            place: 'Пловдив',
            colors: ['#ffffff', '#ffffff'],
        });
    });

    it('marks every field as required', () => {
        renderWithTheme(<Harness />);
        for (const label of [/Булка/, /Младоженец/, /Дата на сватбата/, /Място/]) {
            expect(screen.getByLabelText(label)).toBeRequired();
        }
    });
});
