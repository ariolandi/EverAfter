import { useCallback, useEffect, useState } from 'react';

/** Which screen is shown: the event list (null), an event, or that event's invitation builder. */
export type Route = { eventId: number; building: boolean } | null;

export function parseRoute(pathname: string): Route {
  const match = pathname.match(/^\/events\/(\d+)(\/invitation)?\/?$/);
  return match ? { eventId: Number(match[1]), building: Boolean(match[2]) } : null;
}

export function pathFor(route: Route): string {
  if (route === null) return '/';
  return `/events/${route.eventId}${route.building ? '/invitation' : ''}`;
}

/**
 * Keeps the shown screen in the URL, so every event has its own address
 * and the browser's back/forward buttons move between screens.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: Route) => {
    const path = pathFor(next);
    if (path !== window.location.pathname) window.history.pushState(null, '', path);
    setRoute(next);
  }, []);

  return [route, navigate];
}
