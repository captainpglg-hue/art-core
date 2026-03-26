import { cookies } from "next/headers";
import { getUserByToken, getUserById } from "./db";

const AUTH_COOKIE = "core_session";

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    return await getUserByToken(token);
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export { AUTH_COOKIE };
