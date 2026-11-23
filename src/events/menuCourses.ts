import { MENU_COURSE_KEYS, type MenuCourses } from '../../shared/types';

const LABELS: Record<keyof MenuCourses, string> = {
    salad: 'Салата',
    appetizer: 'Предястие',
    mainCourse: 'Основно',
};

/** The courses every menu has, in the order they are served. */
export const MENU_COURSES = MENU_COURSE_KEYS.map((key) => ({ key, label: LABELS[key] }));
