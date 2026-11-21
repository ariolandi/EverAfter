import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GeneratedImage } from '../../shared/types';
import { api } from '../api';
import { eventInfo, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import Builder from './Builder';

vi.mock('../api');

const image = (id: number): GeneratedImage => ({
    id,
    prompt: 'цветя',
    createdAt: '2026-11-01T10:00:00.000Z',
    url: `/api/images/${id}/file`,
});

describe('Builder', () => {
    it('publishes a new invitation once the details are filled in', async () => {
        vi.mocked(api.listImages).mockResolvedValue([image(5), image(4)]);
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        vi.mocked(api.publishForm).mockResolvedValue(publishedForm({ imageId: 5, imageUrl: '/api/forms/abc123/image' }));
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        expect(await screen.findByRole('heading', { name: 'Създай своята покана' })).toBeInTheDocument();
        const save = screen.getByRole('button', { name: 'Запази' });
        expect(save).toBeDisabled();

        await user.type(screen.getByLabelText(/Булка/), 'Мария');
        await user.type(screen.getByLabelText(/Младоженец/), 'Иван');
        fireEvent.change(screen.getByLabelText(/Дата на сватбата/), { target: { value: '2027-06-12' } });
        await user.type(screen.getByLabelText(/Място/), 'Пловдив');
        await user.click(save);

        // A new invitation defaults to the latest image.
        expect(api.publishForm).toHaveBeenCalledWith(
            1,
            5,
            { showName: true, showAnswer: true },
            { brideName: 'Мария', groomName: 'Иван', weddingDate: '2027-06-12', place: 'Пловдив', colors: ['#ffffff'] },
        );
        expect(await screen.findByText('Поканата е запазена')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Редактирай поканата' })).toBeInTheDocument();
    });

    it('loads and updates an existing invitation', async () => {
        vi.mocked(api.listImages).mockResolvedValue([]);
        vi.mocked(api.getEvent).mockResolvedValue(
            eventInfo({ invitation: publishedForm({ imageId: 99, imageUrl: '/api/forms/abc123/image' }) }),
        );
        vi.mocked(api.updateForm).mockResolvedValue(publishedForm({ place: 'София' }));
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        expect(await screen.findByRole('heading', { name: 'Редактирай поканата' })).toBeInTheDocument();
        const place = screen.getByLabelText(/Място/);
        expect(place).toHaveValue('Пловдив');
        await user.clear(place);
        await user.type(place, 'София');
        await user.click(screen.getByRole('button', { name: 'Запази' }));

        // The saved image is kept even though it isn't in this user's gallery (another owner picked it).
        expect(api.updateForm).toHaveBeenCalledWith(
            'abc123',
            99,
            { showName: true, showAnswer: true },
            expect.objectContaining({ place: 'София' }),
        );
    });

    it('saves and moves to the image step with Напред', async () => {
        vi.mocked(api.listImages).mockResolvedValue([]);
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.updateForm).mockResolvedValue(publishedForm());
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        await user.click(await screen.findByRole('button', { name: 'Напред' }));
        expect(api.updateForm).toHaveBeenCalled();
        expect(await screen.findByLabelText('Describe the image')).toBeInTheDocument();
    });

    it('generates an image from a prompt', async () => {
        vi.mocked(api.listImages).mockResolvedValue([]);
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo({ invitation: publishedForm() }));
        vi.mocked(api.generateImage).mockResolvedValue(image(7));
        const { user } = renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);

        await user.click(await screen.findByRole('tab', { name: /Изображение/ }));
        const prompt = screen.getByLabelText('Describe the image');
        await user.type(prompt, 'рози{Enter}');

        expect(api.generateImage).toHaveBeenCalledWith('рози');
        await vi.waitFor(() => expect(prompt).toHaveValue(''));
    });

    it('shows the error when loading fails', async () => {
        vi.mocked(api.listImages).mockRejectedValue(new Error('not signed in'));
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        renderWithTheme(<Builder eventId={1} onBack={vi.fn()} />);
        expect(await screen.findByText('not signed in')).toBeInTheDocument();
    });

    it('goes back to the event', async () => {
        vi.mocked(api.listImages).mockResolvedValue([]);
        vi.mocked(api.getEvent).mockResolvedValue(eventInfo());
        const onBack = vi.fn();
        const { user } = renderWithTheme(<Builder eventId={1} onBack={onBack} />);
        await user.click(await screen.findByRole('button', { name: 'Към събитието' }));
        expect(onBack).toHaveBeenCalled();
    });
});
