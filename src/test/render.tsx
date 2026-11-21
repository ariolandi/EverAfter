import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { theme } from '../theme/theme';

const withTheme = (ui: ReactElement) => <ThemeProvider theme={theme}>{ui}</ThemeProvider>;

/** Renders with the app's theme and returns a user-event instance to drive it. */
export function renderWithTheme(ui: ReactElement) {
    const user = userEvent.setup();
    const result = render(withTheme(ui));
    // Keeps the theme around re-rendered elements so the component under test stays mounted.
    return { user, ...result, rerender: (next: ReactElement) => result.rerender(withTheme(next)) };
}
