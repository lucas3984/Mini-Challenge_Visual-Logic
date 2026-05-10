/**
 * Small router registry so pages can navigate without touching location.hash
 * directly. Keeps SPA navigation centralized in the router module.
 */

let appRouter = null;

export function setAppRouter(router) {
  appRouter = router;
}

export function navigateTo(path) {
  if (appRouter) {
    appRouter.navigate(path);
    return;
  }
  location.hash = path;
}

export function replaceRoute(path) {
  if (appRouter && typeof appRouter.replace === 'function') {
    appRouter.replace(path);
    return;
  }
  history.replaceState(null, '', `#${path}`);
}
