import { apiRequest } from "@/lib/api";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  requiresTwoFactor: boolean;
  userId?: string;
  email?: string;
  user?: AuthUser;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiRequest("/auth/me", {
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data?.authenticated || !data?.user) {
      return null;
    }

    return data.user as AuthUser;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });
  } catch {
    // El estado local será limpiado por AuthProvider.
  }
}

export function getUserInitials(
  user: AuthUser | null
): string {
  if (!user) {
    return "??";
  }

  const first =
    user.firstName?.trim().charAt(0) || "";

  const last =
    user.lastName?.trim().charAt(0) || "";

  return `${first}${last}`.toUpperCase();
}

export function getUserDisplayName(
  user: AuthUser | null
): string {
  if (!user) {
    return "Usuario";
  }

  return `${user.firstName} ${user.lastName}`;
}

export function clearAuthSession() {
  // Authentication is controlled by the
  // HttpOnly server session.
}
