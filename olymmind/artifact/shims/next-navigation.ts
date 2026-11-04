import { navigate, useLocation } from "./router";

export function useSearchParams() {
  return useLocation().query;
}
export function usePathname() {
  return useLocation().path;
}
export function useRouter() {
  return { push: navigate, replace: navigate, back: () => navigate("/") };
}
