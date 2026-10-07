/**
 * Build an href from a base path, the current search params and a patch.
 * Keys set to null/undefined/"" are removed. Changing a filter resets paging.
 */
export function hrefWith(pathname, current = {}, patch = {}, { resetPage = true } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current || {})) {
    if (value != null && value !== "") params.set(key, Array.isArray(value) ? value[0] : value);
  }
  if (resetPage && !("page" in patch)) params.delete("page");
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
