import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_COLORS } from '../../shared/types';
import { renderWithTheme } from '../test/render';
import ColorPalette from './ColorPalette';

describe('ColorPalette', () => {
    it('changes a colour', () => {
        const onChange = vi.fn();
        renderWithTheme(<ColorPalette colors={['#ffffff', '#000000']} onChange={onChange} />);
        const input = screen.getByLabelText('Цвят 2').querySelector('input')!;
        fireEvent.change(input, { target: { value: '#ff0000' } });
        expect(onChange).toHaveBeenCalledWith(['#ffffff', '#ff0000']);
    });

    it('adds a white colour', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(<ColorPalette colors={['#000000']} onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Добави цвят' }));
        expect(onChange).toHaveBeenCalledWith(['#000000', '#ffffff']);
    });

    it('removes a colour', async () => {
        const onChange = vi.fn();
        const { user } = renderWithTheme(<ColorPalette colors={['#111111', '#222222', '#333333']} onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Премахни цвят 2' }));
        expect(onChange).toHaveBeenCalledWith(['#111111', '#333333']);
    });

    it('keeps at least one colour', () => {
        renderWithTheme(<ColorPalette colors={['#111111']} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /Премахни цвят/ })).not.toBeInTheDocument();
    });

    it(`allows at most ${MAX_COLORS} colours`, () => {
        renderWithTheme(<ColorPalette colors={Array(MAX_COLORS).fill('#111111')} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Добави цвят' })).not.toBeInTheDocument();
    });
});
