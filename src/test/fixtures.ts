import type { EventInfo, Guest, GuestGroup, Menu, PublishedForm, ScheduleItem } from '../../shared/types';

export const publishedForm = (overrides: Partial<PublishedForm> = {}): PublishedForm => ({
    slug: 'abc123',
    imageId: null,
    imageUrl: null,
    showName: true,
    showAnswer: true,
    brideName: 'Мария',
    groomName: 'Иван',
    weddingDate: '2027-06-12',
    place: 'Пловдив',
    colors: ['#6b6254', '#c9a227'],
    primaryColor: 0,
    secondaryColor: 1,
    invitationText: '',
    accommodationNotes: '',
    transportNotes: '',
    dressCode: 'cocktail',
    colorUsage: 'informative',
    ...overrides,
});

export const eventInfo = (overrides: Partial<EventInfo> = {}): EventInfo => ({
    id: 1,
    name: 'Нашата сватба',
    createdAt: '2026-11-01T10:00:00.000Z',
    guestCount: 0,
    invitation: null,
    isOwner: true,
    ownerName: 'Мария',
    ...overrides,
});

export const guest = (id: number, name: string, groupId: number | null = null, isChild = false): Guest => ({
    id,
    name,
    groupId,
    token: `guest-token-${id}`,
    isChild,
    createdAt: '2026-11-01T10:00:00.000Z',
});

export const guestGroup = (overrides: Partial<GuestGroup> = {}): GuestGroup => ({
    id: 10,
    name: 'Семейство Иванови',
    token: 'grp-token',
    guestIds: [],
    response: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
});

export const menu = (overrides: Partial<Menu> = {}): Menu => ({
    id: 20,
    name: 'Класическо меню',
    isChild: false,
    salad: 'Шопска салата',
    appetizer: 'Пълнени чушки',
    mainCourse: 'Свинско с картофи',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
});

export const scheduleItem = (overrides: Partial<ScheduleItem> = {}): ScheduleItem => ({
    id: 30,
    title: 'Церемония',
    startTime: '15:00',
    place: 'Градината на хотела',
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
});
