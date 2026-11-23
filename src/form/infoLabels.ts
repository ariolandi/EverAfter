import type { ColorUsage, DressCode } from '../../shared/types';

/** The dress codes as the builder and the invitation name them. */
export const DRESS_CODE_LABELS: Record<DressCode, string> = {
    cocktail: 'коктейлно',
    formal: 'официално',
};

/** What the builder offers for how strictly guests should wear the colours. */
export const COLOR_USAGE_LABELS: Record<ColorUsage, string> = {
    mandatory: 'Задължителни',
    suggested: 'Препоръчителни',
    informative: 'Информативни',
};

/** What the invitation tells guests about the colours, by how strictly they are asked to wear them. */
export const COLOR_USAGE_NOTES: Record<ColorUsage, string> = {
    mandatory: 'Моля, спазвайте цветовете на сватбата',
    suggested: 'Ще се радваме, ако облеклото ви е в тези цветове',
    informative: 'Цветовете на нашата сватба',
};
