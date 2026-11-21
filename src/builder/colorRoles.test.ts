import { describe, expect, it } from 'vitest';
import type { InvitationColors } from '../../shared/types';
import { addColor, markColor, removeColor } from './colorRoles';

const abc: InvitationColors = { colors: ['#aaaaaa', '#bbbbbb', '#cccccc'], primaryColor: 0, secondaryColor: 1 };

describe('markColor', () => {
    it('moves a mark to a colour without one', () => {
        expect(markColor(abc, 2, 'secondaryColor')).toEqual({ ...abc, secondaryColor: 2 });
    });

    it('swaps the marks when the colour carries the other one', () => {
        expect(markColor(abc, 1, 'primaryColor')).toEqual({ ...abc, primaryColor: 1, secondaryColor: 0 });
        expect(markColor(abc, 0, 'secondaryColor')).toEqual({ ...abc, primaryColor: 1, secondaryColor: 0 });
    });

    it('leaves a single colour with both marks', () => {
        const one = { colors: ['#aaaaaa'], primaryColor: 0, secondaryColor: 0 };
        expect(markColor(one, 0, 'primaryColor')).toEqual(one);
    });
});

describe('addColor', () => {
    it('gives the new colour the secondary mark when there was only one colour', () => {
        expect(addColor({ colors: ['#aaaaaa'], primaryColor: 0, secondaryColor: 0 }, '#ffffff')).toEqual({
            colors: ['#aaaaaa', '#ffffff'],
            primaryColor: 0,
            secondaryColor: 1,
        });
    });

    it('keeps the marks where they are otherwise', () => {
        expect(addColor(abc, '#ffffff')).toEqual({ ...abc, colors: [...abc.colors, '#ffffff'] });
    });
});

describe('removeColor', () => {
    it('keeps the marks on their colours', () => {
        const marked = { ...abc, primaryColor: 2, secondaryColor: 0 };
        expect(removeColor(marked, 1)).toEqual({ colors: ['#aaaaaa', '#cccccc'], primaryColor: 1, secondaryColor: 0 });
    });

    it('moves the primary mark to the first colour without the secondary one', () => {
        expect(removeColor(abc, 0)).toEqual({ colors: ['#bbbbbb', '#cccccc'], primaryColor: 1, secondaryColor: 0 });
    });

    it('moves the secondary mark to the first colour without the primary one', () => {
        expect(removeColor(abc, 1)).toEqual({ colors: ['#aaaaaa', '#cccccc'], primaryColor: 0, secondaryColor: 1 });
    });

    it('puts both marks on the last colour left', () => {
        const two = { colors: ['#aaaaaa', '#bbbbbb'], primaryColor: 0, secondaryColor: 1 };
        expect(removeColor(two, 0)).toEqual({ colors: ['#bbbbbb'], primaryColor: 0, secondaryColor: 0 });
        expect(removeColor(two, 1)).toEqual({ colors: ['#aaaaaa'], primaryColor: 0, secondaryColor: 0 });
    });
});
