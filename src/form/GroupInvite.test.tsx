import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupInvitation, GuestResponse, InvitedGuest } from '../../shared/types';
import { api } from '../api';
import { menu, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GroupInvite from './GroupInvite';

vi.mock('../api');

const guest = (id: number, name: string, isChild = false, response: GuestResponse | null = null): InvitedGuest => ({
  id,
  name,
  isChild,
  response,
});

const recorded = (overrides: Partial<GuestResponse> = {}): GuestResponse => ({
  respondedAt: '2026-11-19T10:00:00.000Z',
  answer: true,
  menuId: null,
  accommodation: true,
  transport: 'own',
  ...overrides,
});

const invitation = (overrides: Partial<GroupInvitation> = {}): GroupInvitation => ({
  form: publishedForm(),
  eventName: 'Сватба',
  schedule: [],
  groupName: 'Семейство Иванови',
  guests: [guest(1, 'Иван Иванов'), guest(2, 'Мария Иванова')],
  menus: [],
  ...overrides,
});

type User = ReturnType<typeof renderWithTheme>['user'];

/** Picks accommodation and own transport for a guest, as a guest who comes does on the last two pages. */
async function pickLogistics(user: User, name: string) {
  await user.click(
    within(screen.getByRole('group', { name: `Нощувка за ${name}` })).getByRole('button', { name: 'Ще се възползвам' }),
  );
  await user.click(
    within(screen.getByRole('group', { name: `Собствен превоз за ${name}` })).getByRole('button', {
      name: 'Имам собствен превоз',
    }),
  );
}

describe('GroupInvite', () => {
  it('loads the group’s invitation by its token with the names filled in', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(invitation());
    renderWithTheme(<GroupInvite token="grp-token" />);

    expect(await screen.findByText('Мария & Иван')).toBeInTheDocument();
    expect(api.getGroupInvitation).toHaveBeenCalledWith('grp-token');
    // Greeted by first name on the cover; each guest's full name heads their answer.
    expect(screen.getByText('Иван и Мария')).toBeInTheDocument();
    expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Мария Иванова').length).toBeGreaterThan(0);
  });

  it('sends the answer, then shows the success message and the answer', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(invitation());
    vi.mocked(api.submitGroupResponse).mockResolvedValue(
      invitation({
        guests: [
          guest(1, 'Иван Иванов', false, recorded({ accommodation: false, transport: 'arrangesOwn' })),
          guest(2, 'Мария Иванова', false, recorded({ answer: false, accommodation: null, transport: null })),
        ],
      }),
    );
    const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

    const ivan = await screen.findByRole('group', { name: 'Отговор за Иван Иванов' });
    await user.click(within(ivan).getByRole('button', { name: 'Ще присъства' }));
    const maria = screen.getByRole('group', { name: 'Отговор за Мария Иванова' });
    await user.click(within(maria).getByRole('button', { name: 'Няма да присъства' }));

    // Ivan comes, so he says how he stays and travels; Maria does not, so her choices are locked.
    await user.click(
      within(screen.getByRole('group', { name: 'Нощувка за Иван Иванов' })).getByRole('button', {
        name: 'Няма да се възползвам',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Собствен превоз за Иван Иванов' })).getByRole('button', {
        name: 'Нямам собствен превоз',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Помощ с превоза за Иван Иванов' })).getByRole('button', {
        name: 'Ще си осигуря сам',
      }),
    );
    for (const name of ['Нощувка за Мария Иванова', 'Собствен превоз за Мария Иванова']) {
      for (const button of within(screen.getByRole('group', { name })).getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
    }

    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

    expect(api.submitGroupResponse).toHaveBeenCalledWith('grp-token', {
      answers: [
        { guestId: 1, answer: true, accommodation: false, transport: 'arrangesOwn' },
        { guestId: 2, answer: false },
      ],
    });
    expect(
      await screen.findByText(
        'Благодарим ви! Можете да преглеждате информацията по всяко време, както и своите отговори.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
    // The invitation is now read-only, with what was sent selected.
    expect(
      within(screen.getByRole('group', { name: 'Отговор за Иван Иванов' })).getByRole('button', { name: 'Ще присъства' }),
    ).toBeDisabled();
  });

  it('opens the invitation read-only with the recorded answers selected once the guests have answered', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(
      invitation({
        menus: [menu()],
        guests: [
          guest(1, 'Иван Иванов', false, recorded({ menuId: 20, accommodation: true, transport: 'needsHelp' })),
          guest(2, 'Мария Иванова', false, recorded({ answer: false, accommodation: null, transport: null })),
        ],
      }),
    );
    renderWithTheme(<GroupInvite token="grp-token" />);

    // It opens on the cover like any other visit, not on a summary of the answer.
    expect(await screen.findByText('Иван и Мария')).toBeInTheDocument();
    const ivan = screen.getByRole('group', { name: 'Отговор за Иван Иванов' });
    expect(within(ivan).getByRole('button', { name: 'Ще присъства' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(ivan).getByRole('button', { name: 'Ще присъства' })).toBeDisabled();
    expect(
      within(screen.getByRole('group', { name: 'Отговор за Мария Иванова' })).getByRole('button', {
        name: 'Няма да присъства',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Нощувка за Иван Иванов' })).getByRole('button', {
        name: 'Ще се възползвам',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Помощ с превоза за Иван Иванов' })).getByRole('button', {
        name: 'Бих се възползвал от помощ',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('combobox', { name: 'Меню' })[0]).toHaveTextContent('Класическо меню');
    expect(screen.getByText(/Благодарим ви!/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
  });

  it('lets the guests who have not answered yet answer from the group link', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(
      invitation({ guests: [guest(1, 'Иван Иванов', false, recorded()), guest(2, 'Мария Иванова')] }),
    );
    vi.mocked(api.submitGroupResponse).mockResolvedValue(invitation());
    const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

    await user.click(
      within(await screen.findByRole('group', { name: 'Отговор за Мария Иванова' })).getByRole('button', {
        name: 'Няма да присъства',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

    expect(api.submitGroupResponse).toHaveBeenCalledWith('grp-token', { answers: [{ guestId: 2, answer: false }] });
  });

  it('opens a single guest own link and sends their answer to it', async () => {
    vi.mocked(api.getGuestInvitation).mockResolvedValue(invitation({ guests: [guest(1, 'Иван Иванов')] }));
    vi.mocked(api.submitGuestResponse).mockResolvedValue(
      invitation({ guests: [guest(1, 'Иван Иванов', false, recorded())] }),
    );
    const { user } = renderWithTheme(<GroupInvite token="guest-token" kind="guest" />);

    expect(api.getGroupInvitation).not.toHaveBeenCalled();
    await user.click(
      within(await screen.findByRole('group', { name: 'Отговор за Иван Иванов' })).getByRole('button', {
        name: 'Ще присъства',
      }),
    );
    await pickLogistics(user, 'Иван Иванов');
    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

    expect(api.submitGuestResponse).toHaveBeenCalledWith('guest-token', {
      answers: [{ guestId: 1, answer: true, accommodation: true, transport: 'own' }],
    });
    expect(
      await screen.findByText('Благодарим ти! Можеш да преглеждаш информацията по всяко време, както и своите отговори.'),
    ).toBeInTheDocument();
  });

  it('shows the menus page and lets only children pick the children’s menu', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(
      invitation({
        guests: [
          guest(1, 'Иван Иванов'),
          guest(2, 'Ники Иванов', true),
        ],
        menus: [menu(), menu({ id: 21, name: 'Детско меню', isChild: true })],
      }),
    );
    vi.mocked(api.submitGroupResponse).mockResolvedValue(invitation());
    const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

    // The menus page shows every menu with its dishes.
    expect((await screen.findAllByText('Шопска салата')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Детско меню').length).toBeGreaterThan(0);

    const [ivanMenu, nikiMenu] = screen.getAllByRole('combobox', { name: 'Меню' });
    await user.click(ivanMenu);
    const adultOptions = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(adultOptions.map((o) => o.textContent)).toEqual(['Класическо меню']);
    await user.click(adultOptions[0]);

    await user.click(nikiMenu);
    const childOptions = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(childOptions.map((o) => o.textContent)).toEqual(['Класическо меню', 'Детско меню']);
    await user.click(childOptions[1]);

    for (const name of ['Иван Иванов', 'Ники Иванов']) {
      await user.click(
        within(screen.getByRole('group', { name: `Отговор за ${name}` })).getByRole('button', { name: 'Ще присъства' }),
      );
      await pickLogistics(user, name);
    }
    await user.click(screen.getByRole('button', { name: 'Изпрати' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Потвърди и изпрати' }));

    expect(api.submitGroupResponse).toHaveBeenCalledWith('grp-token', {
      answers: [
        { guestId: 1, answer: true, menuId: 20, accommodation: true, transport: 'own' },
        { guestId: 2, answer: true, menuId: 21, accommodation: true, transport: 'own' },
      ],
    });
  });

  it('locks the menu, accommodation and transport of a guest who will not come', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(invitation({ menus: [menu()] }));
    const { user } = renderWithTheme(<GroupInvite token="grp-token" />);

    const [ivanMenu, mariaMenu] = await screen.findAllByRole('combobox', { name: 'Меню' });
    const ivan = await screen.findByRole('group', { name: 'Отговор за Иван Иванов' });
    await user.click(within(ivan).getByRole('button', { name: 'Няма да присъства' }));

    expect(ivanMenu).toHaveAttribute('aria-disabled', 'true');
    expect(mariaMenu).not.toHaveAttribute('aria-disabled', 'true');
    for (const name of ['Нощувка за Иван Иванов', 'Собствен превоз за Иван Иванов']) {
      for (const button of within(screen.getByRole('group', { name })).getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
    }
    // Their answer no longer waits for choices they cannot make.
    await user.click(
      within(screen.getByRole('group', { name: 'Отговор за Мария Иванова' })).getByRole('button', {
        name: 'Няма да присъства',
      }),
    );
    expect(screen.getByRole('button', { name: 'Изпрати' })).toBeEnabled();
  });

  it('shows the error when the link is unknown', async () => {
    vi.mocked(api.getGroupInvitation).mockRejectedValue(new Error('invitation not found'));
    renderWithTheme(<GroupInvite token="missing" />);
    expect(await screen.findByText('invitation not found')).toBeInTheDocument();
  });
});
