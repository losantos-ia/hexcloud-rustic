export type UserRole = "admin" | "vendedor" | "tecnico";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  tecnico: "Técnico",
};
