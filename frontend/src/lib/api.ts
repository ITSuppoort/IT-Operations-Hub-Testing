const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";


/**
 * Cliente HTTP centralizado.
 *
 * IMPORTANTE:
 * - Usa la variable NEXT_PUBLIC_API_URL.
 * - Envía automáticamente la cookie HttpOnly.
 * - NO usa tokens en localStorage.
 * - Devuelve el objeto Response para mantener
 *   compatibilidad con los módulos existentes.
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {

  const headers =
    new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  return fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers,

      credentials: "include",

      cache: "no-store",
    }
  );
}


export function getApiUrl() {
  return API_URL;
}