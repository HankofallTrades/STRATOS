export type RouteSkeletonKind =
  | "login"
  | "home"
  | "workout"
  | "analytics"
  | "profile"
  | "settings"
  | "generic";

export const getRouteSkeletonKind = (pathname: string): RouteSkeletonKind => {
  if (pathname === "/login" || pathname === "/waitlist") return "login";
  if (pathname === "/") return "home";
  if (pathname.startsWith("/workout")) return "workout";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/profile/settings") || pathname === "/settings") {
    return "settings";
  }
  if (pathname.startsWith("/profile")) return "profile";
  return "generic";
};
