"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, createUserProfile } from "@/lib/firestore/users";
import type { AppUser } from "@/types/user";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

function setSessionCookie(value: string) {
  document.cookie = `session=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = "session=; path=/; max-age=0; SameSite=Lax";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setSessionCookie("1");

        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          // First login — create profile with default role
          await createUserProfile(
            firebaseUser.uid,
            firebaseUser.email ?? "",
            firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "Usuario"
          );
          profile = await getUserProfile(firebaseUser.uid);
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName:
            profile?.displayName ||
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "Usuario",
          role: profile?.role ?? "vendedor",
          photoURL: firebaseUser.photoURL ?? undefined,
        });
      } else {
        clearSessionCookie();
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    clearSessionCookie();
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
