import type { InvitationColors } from '../../shared/types';

/** The two marks a colour can carry. */
export type ColorRole = 'primaryColor' | 'secondaryColor';

const otherRole = (role: ColorRole): ColorRole => (role === 'primaryColor' ? 'secondaryColor' : 'primaryColor');

/** Marks a colour with a role. If that colour carries the other mark, the two colours swap marks. */
export function markColor(palette: InvitationColors, index: number, role: ColorRole): InvitationColors {
    const other = otherRole(role);
    if (palette[other] === index && palette.colors.length > 1) {
        return { ...palette, [role]: index, [other]: palette[role] };
    }
    return { ...palette, [role]: index };
}

export function setColor(palette: InvitationColors, index: number, color: string): InvitationColors {
    return { ...palette, colors: palette.colors.map((c, i) => (i === index ? color : c)) };
}

/** Adds a colour at the end. A palette of one colour carries both marks, so the new colour takes the secondary. */
export function addColor(palette: InvitationColors, color: string): InvitationColors {
    const colors = [...palette.colors, color];
    return palette.colors.length === 1 ? { ...palette, colors, secondaryColor: 1 } : { ...palette, colors };
}

/**
 * Removes a colour. A mark it carried moves to the first colour without the other mark,
 * or to the only colour left.
 */
export function removeColor(palette: InvitationColors, index: number): InvitationColors {
    const colors = palette.colors.filter((_c, i) => i !== index);
    // Where a mark ends up once the colour is gone, or null if it was on the removed colour.
    const shift = (i: number) => (i === index ? null : i > index ? i - 1 : i);
    const firstExcept = (taken: number) => Math.max(0, colors.findIndex((_c, i) => i !== taken));

    const primary = shift(palette.primaryColor);
    const secondary = shift(palette.secondaryColor);
    if (primary === null) {
        return { colors, primaryColor: firstExcept(secondary ?? -1), secondaryColor: secondary ?? 0 };
    }
    return { colors, primaryColor: primary, secondaryColor: secondary ?? firstExcept(primary) };
}
