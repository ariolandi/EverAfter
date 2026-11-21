import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_COLORS, type InvitationColors } from '../../shared/types';
import { renderWithTheme } from '../test/render';
import ColorPalette from './ColorPalette';

const palette = (colors: string[], primaryColor = 0, secondaryColor = colors.length > 1 ? 1 : 0): InvitationColors => ({
    colors,
    primaryColor,
    secondaryColor,
});

describe('ColorPalette', () => {
    it('changes a colour', () => {
        const onChange = vi.fn();
        renderWithTheme(<ColorPalette palette={palette(['#ffffff', '#000000'])} onChange={onChange} />);
        const input = screen.getByLabelText('Цвят 2', { selector: 'label' }).querySelector('input')!;
        fireEvent.change(input, { target: { value: '#ff0000' } });
        expect(onChange).toHaveBeenCalledWith(palette(['#ffffff', '#ff0000']));
    });

    it('adds a white colour', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(<ColorPalette palette={palette(['#000000', '#111111'])} onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Добави цвят' }));
        expect(onChange).toHaveBeenCalledWith(palette(['#000000', '#111111', '#ffffff']));
    });

    it('removes a colour', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(
            <ColorPalette palette={palette(['#111111', '#222222', '#333333'], 0, 2)} onChange={onChange} />,
        );
        await user.click(screen.getByRole('button', { name: 'Премахни цвят 2' }));
        expect(onChange).toHaveBeenCalledWith(palette(['#111111', '#333333'], 0, 1));
    });

    it('keeps at least one colour', () => {
        renderWithTheme(<ColorPalette palette={palette(['#111111'])} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /Премахни цвят/ })).not.toBeInTheDocument();
    });

    it(`allows at most ${MAX_COLORS} colours`, () => {
        renderWithTheme(<ColorPalette palette={palette(Array(MAX_COLORS).fill('#111111'))} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Добави цвят' })).not.toBeInTheDocument();
    });

    it('shows which colours are marked primary and secondary', () => {
        renderWithTheme(<ColorPalette palette={palette(['#111111', '#222222', '#333333'], 2, 0)} onChange={vi.fn()} />);
        const primary = screen.getByRole('radiogroup', { name: 'Основен цвят (текст)' });
        const secondary = screen.getByRole('radiogroup', { name: 'Вторичен цвят' });
        expect(within(primary).getByRole('radio', { name: 'Цвят 3' })).toBeChecked();
        expect(within(secondary).getByRole('radio', { name: 'Цвят 1' })).toBeChecked();
        expect(within(primary).getAllByRole('radio', { checked: true })).toHaveLength(1);
        expect(within(secondary).getAllByRole('radio', { checked: true })).toHaveLength(1);
    });

    it('marks another colour as primary', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(
            <ColorPalette palette={palette(['#111111', '#222222', '#333333'])} onChange={onChange} />,
        );
        const primary = screen.getByRole('radiogroup', { name: 'Основен цвят (текст)' });
        await user.click(within(primary).getByRole('radio', { name: 'Цвят 3' }));
        expect(onChange).toHaveBeenCalledWith(palette(['#111111', '#222222', '#333333'], 2, 1));
    });

    it('swaps the marks when the secondary colour is made primary', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(<ColorPalette palette={palette(['#111111', '#222222'])} onChange={onChange} />);
        const primary = screen.getByRole('radiogroup', { name: 'Основен цвят (текст)' });
        await user.click(within(primary).getByRole('radio', { name: 'Цвят 2' }));
        expect(onChange).toHaveBeenCalledWith(palette(['#111111', '#222222'], 1, 0));
    });
});
