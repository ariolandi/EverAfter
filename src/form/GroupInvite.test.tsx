import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupInvitation } from '../../shared/types';
import { api } from '../api';
import { menu, publishedForm } from '../test/fixtures';
import { renderWithTheme } from '../test/render';
import GroupInvite from './GroupInvite';

vi.mock('../api');

const invitation = (overrides: Partial<GroupInvitation> = {}): GroupInvitation => ({
  form: publishedForm(),
  schedule: [],
  groupName: 'Семейство Иванови',
  guests: [
    { id: 1, name: 'Иван Иванов', isChild: false },
    { id: 2, name: 'Мария Иванова', isChild: false },
  ],
  menus: [],
  response: null,
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
    vi.mocked(api.submitGroupResponse).mockResolvedValue({
      respondedAt: '2026-11-19T10:00:00.000Z',
      guests: [
        { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: null, transport: null },
        { guestId: 2, name: 'Мария Иванова', answer: false, menuId: null, accommodation: null, transport: null },
      ],
    });
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
    expect(await screen.findByText('Отговорът е изпратен успешно!')).toBeInTheDocument();
    expect(screen.getByText('Вашият отговор')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
  });

  it('opens the recorded answer when the group has already answered', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(
      invitation({
        response: {
          respondedAt: '2026-11-19T10:00:00.000Z',
          guests: [
            { guestId: 1, name: 'Иван Иванов', answer: true, menuId: null, accommodation: null, transport: null },
            { guestId: 2, name: 'Мария Иванова', answer: true, menuId: null, accommodation: null, transport: null },
          ],
        },
      }),
    );
    renderWithTheme(<GroupInvite token="grp-token" />);

    expect(await screen.findByText(/Вече отговорихте на поканата/)).toBeInTheDocument();
    expect(screen.getAllByText('Ще присъства')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Изпрати' })).not.toBeInTheDocument();
  });

  it('shows the menus page and lets only children pick the children’s menu', async () => {
    vi.mocked(api.getGroupInvitation).mockResolvedValue(
      invitation({
        guests: [
          { id: 1, name: 'Иван Иванов', isChild: false },
          { id: 2, name: 'Ники Иванов', isChild: true },
        ],
        menus: [menu(), menu({ id: 21, name: 'Детско меню', isChild: true })],
      }),
    );
    vi.mocked(api.submitGroupResponse).mockResolvedValue({
      respondedAt: '2026-11-19T10:00:00.000Z',
      guests: [],
    });
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
