import type { MenuCourses } from '../../shared/types';

/** The courses every menu has, in the order they are served. */
export const MENU_COURSES: { key: keyof MenuCourses; label: string }[] = [
    { key: 'salad', label: 'Салата' },
    { key: 'appetizer', label: 'Предястие' },
    { key: 'mainCourse', label: 'Основно ястие' },
];
