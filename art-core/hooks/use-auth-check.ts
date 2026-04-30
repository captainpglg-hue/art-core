"use client";

import { useEffect, useState } from "react";

export interface AuthCheckUser {
  id: string;
  role?: string;
  full_name?: string;
  email?: string;
}

/**
 * Lit /api/auth/me avec garde-fou timeout. Évite que l'UI reste bloquée sur
 * "Chargement..." si l'edge function hang silencieusement.
 *
 * Usage:
 *   const { user, checked } = useAuthCheck();
 *   if (checked && !user) router.replace("/auth/login");
 */
export function useAuthCheck(timeoutMs = 4000): {
  user: AuthCheckUser | null;
  checked: boolean;
} {
  const [user, setUser] = useState<AuthCheckUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => { if (alive) setChecked(true); }, timeoutMs);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.user?.id) setUser(d.user as AuthCheckUser);
        setChecked(true);
      })
      .catch(() => { if (alive) setChecked(true); })
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  return { user, checked };
}
