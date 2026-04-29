import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

const SETTINGS_DOC = "settings/company";

export interface CompanySettings {
  name: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  updatedAt?: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToCompany(data: Record<string, any>): CompanySettings {
  return {
    name: data.name ?? "",
    legalName: data.legalName ?? undefined,
    taxId: data.taxId ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    website: data.website ?? undefined,
    address: data.address ?? undefined,
    city: data.city ?? undefined,
    country: data.country ?? undefined,
    logoUrl: data.logoUrl ?? undefined,
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
  };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  ) as Partial<T>;
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const snap = await getDoc(doc(db, SETTINGS_DOC));
  if (!snap.exists()) return null;
  return docToCompany(snap.data());
}

export async function saveCompanySettings(data: Omit<CompanySettings, "updatedAt" | "logoUrl">): Promise<void> {
  await setDoc(
    doc(db, SETTINGS_DOC),
    { ...stripUndefined(data as object), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const logoRef = ref(storage, `settings/company-logo.${ext}`);
  await uploadBytes(logoRef, file, { contentType: file.type });
  const url = await getDownloadURL(logoRef);
  // Persist the URL to Firestore
  await setDoc(
    doc(db, SETTINGS_DOC),
    { logoUrl: url, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return url;
}

export async function deleteCompanyLogo(): Promise<void> {
  // Try common extensions
  for (const ext of ["png", "jpg", "jpeg", "webp", "svg"]) {
    try {
      await deleteObject(ref(storage, `settings/company-logo.${ext}`));
    } catch {
      // ignore — file may not exist with this extension
    }
  }
  await setDoc(
    doc(db, SETTINGS_DOC),
    { logoUrl: null, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
