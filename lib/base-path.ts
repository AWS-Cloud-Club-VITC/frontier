const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const BASE_PATH = rawBasePath === "/" ? "" : rawBasePath.replace(/\/+$/, "");

export function withBasePath(path: string) {
  if (!BASE_PATH) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return path === "/" ? BASE_PATH : `${BASE_PATH}${path}`;
}

export function stripBasePath(path: string) {
  if (!BASE_PATH) return path;
  return path === BASE_PATH ? "/" : path.startsWith(`${BASE_PATH}/`) ? path.slice(BASE_PATH.length) : path;
}