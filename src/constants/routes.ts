export const Routes = {
  HOME: "/",
  LOGIN: "/login",
} as const;

/** Pages reachable without a session. Everything else redirects to `Routes.LOGIN`. */
export const PUBLIC_PATHS: readonly string[] = [Routes.LOGIN];
