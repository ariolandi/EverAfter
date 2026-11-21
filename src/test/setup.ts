import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// jsdom doesn't implement scrolling; InvitationForm scrolls between its pages.
Element.prototype.scrollTo = function scrollTo() {};
