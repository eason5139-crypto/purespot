"use client";
import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function postAuth(body: Record<string, string>) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "操作失敗，請再試一次";
    throw new Error(msg);
  }
  return data as { user: AuthUser };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  fetchUser: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      if (!res.ok) {
        set({ user: null });
        return;
      }
      const data = (await res.json()) as { user: AuthUser | null };
      set({ user: data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const { user } = await postAuth({ action: "login", email, password });
    set({ user });
  },

  register: async (email, password, name) => {
    const { user } = await postAuth({
      action: "register",
      email,
      password,
      name,
    });
    set({ user });
  },

  logout: async () => {
    await fetch("/api/auth", { method: "DELETE" });
    set({ user: null });
  },
}));
