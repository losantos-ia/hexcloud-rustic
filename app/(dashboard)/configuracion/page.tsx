"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, Check, Building2, Upload, Trash2, Loader2, Save, User, KeyRound, Eye, EyeOff } from "lucide-react";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/context/currency-context";
import { useAuth } from "@/context/auth-context";
import {
  getCompanySettings,
  saveCompanySettings,
  uploadCompanyLogo,
  deleteCompanyLogo,
  type CompanySettings,
} from "@/lib/firestore/company";
import { updateUserDisplayName } from "@/lib/firestore/users";
import { auth } from "@/lib/firebase";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLE_LABELS } from "@/types/user";

export default function ConfiguracionPage() {
  const { currency, setCurrency, formatCurrency, currencyConfig } = useCurrency();
  const { user } = useAuth();

  // ── Profile state ────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [savedPwd, setSavedPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    setNameError(null);
    setSavedName(false);
    try {
      await updateUserDisplayName(user.uid, displayName.trim());
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      setSavedName(true);
      setTimeout(() => setSavedName(false), 3000);
    } catch (err) {
      console.error(err);
      setNameError("No se pudo actualizar el nombre. Inténtalo de nuevo.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setSavedPwd(false);
    if (newPassword !== confirmPassword) {
      setPwdError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!auth.currentUser?.email) return;
    setSavingPwd(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setSavedPwd(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSavedPwd(false), 3000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPwdError("La contraseña actual es incorrecta.");
      } else {
        setPwdError("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setSavingPwd(false);
    }
  }

  // Company state
  const [company, setCompany] = useState<CompanySettings>({
    name: "",
    legalName: "",
    taxId: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    country: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCompanySettings().then((data) => {
      if (data) {
        setCompany({
          name: data.name ?? "",
          legalName: data.legalName ?? "",
          taxId: data.taxId ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          country: data.country ?? "",
        });
        setLogoUrl(data.logoUrl ?? null);
      }
    }).finally(() => setLoadingCompany(false));
  }, []);

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSavingCompany(true);
    setSavedOk(false);
    try {
      await saveCompanySettings({
        name: company.name,
        legalName: company.legalName || undefined,
        taxId: company.taxId || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
        website: company.website || undefined,
        address: company.address || undefined,
        city: company.city || undefined,
        country: company.country || undefined,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Solo se permiten imágenes PNG, JPG, WEBP o SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("El archivo no puede superar 2 MB.");
      return;
    }
    setLogoError(null);
    setUploadingLogo(true);
    setLogoError(null);
    try {
      const url = await uploadCompanyLogo(file);
      setLogoUrl(url);
    } catch (err) {
      console.error("Logo upload failed:", err);
      setLogoError("No se pudo subir el logo. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDeleteLogo() {
    setDeletingLogo(true);
    try {
      await deleteCompanyLogo();
      setLogoUrl(null);
    } finally {
      setDeletingLogo(false);
    }
  }

  function field(key: keyof CompanySettings) {
    return {
      value: (company[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setCompany((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
          <Settings size={16} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Configuración
          </h1>
          <p className="text-xs text-zinc-500">Parámetros del sistema</p>
        </div>
      </div>

      {/* Profile section */}
      {user && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <User size={15} className="text-zinc-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Mi perfil</h2>
              <p className="text-xs text-zinc-500">Actualiza tu nombre y contraseña de acceso.</p>
            </div>
          </div>

          {/* Avatar + role */}
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-amber-400">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{user.displayName}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-md bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                {USER_ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {/* Change name */}
          <form onSubmit={handleSaveName} className="flex flex-col gap-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre para mostrar</p>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre completo"
                className="max-w-xs"
                required
              />
              <button
                type="submit"
                disabled={savingName || !displayName.trim() || displayName.trim() === user.displayName}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingName ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {savingName ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            {savedName && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check size={13} /> Nombre actualizado
              </span>
            )}
          </form>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <KeyRound size={13} className="text-zinc-400" />
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cambiar contraseña</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Contraseña actual</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPwd ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showCurrentPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            {savedPwd && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check size={13} /> Contraseña actualizada correctamente
              </span>
            )}
            <div>
              <button
                type="submit"
                disabled={savingPwd || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingPwd ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                {savingPwd ? "Actualizando…" : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Company section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-zinc-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Datos de la empresa</h2>
            <p className="text-xs text-zinc-500">Se usarán en documentos como cotizaciones PDF.</p>
          </div>
        </div>

        {loadingCompany ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
            <Loader2 size={14} className="animate-spin" /> Cargando…
          </div>
        ) : (
          <form onSubmit={handleSaveCompany} className="flex flex-col gap-5">
            {/* Logo */}
            <div className="flex items-start gap-4">
              <div className="size-20 rounded-xl border border-zinc-700 bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo empresa" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 size={28} className="text-zinc-600" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-zinc-300">Logo de la empresa</p>
                <p className="text-xs text-zinc-500">PNG, JPG, WEBP o SVG · máx. 2 MB</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50 transition-colors"
                  >
                    {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingLogo ? "Subiendo…" : "Subir logo"}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      disabled={deletingLogo}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingLogo ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Eliminar
                    </button>
                  )}
                </div>
                {logoError && <p className="text-xs text-red-400">{logoError}</p>}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Nombre comercial *</Label>
                <Input {...field("name")} placeholder="Rustic Alexanders" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Razón social</Label>
                <Input {...field("legalName")} placeholder="Rustic Alexanders S.A." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>RTN</Label>
                <Input {...field("taxId")} placeholder="0801-1990-12345" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Teléfono</Label>
                <Input {...field("phone")} placeholder="+504 9999-9999" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Correo electrónico</Label>
                <Input type="email" {...field("email")} placeholder="info@empresa.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sitio web</Label>
                <Input {...field("website")} placeholder="www.empresa.com" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Dirección</Label>
                <Input {...field("address")} placeholder="Col. Las Palmas, Calle Principal #12" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ciudad</Label>
                <Input {...field("city")} placeholder="Tegucigalpa" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>País</Label>
                <Input {...field("country")} placeholder="Honduras" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingCompany || !company.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingCompany ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingCompany ? "Guardando…" : "Guardar datos"}
              </button>
              {savedOk && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={13} /> Guardado correctamente
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Currency section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Moneda del sistema</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Aplica a todos los módulos del ERP — cotizaciones, pedidos, finanzas y reportes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.values(CURRENCIES) as Array<(typeof CURRENCIES)[CurrencyCode]>).map((cfg) => {
            const active = currency === cfg.code;
            return (
              <button
                key={cfg.code}
                type="button"
                onClick={() => setCurrency(cfg.code)}
                className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 size-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check size={11} className="text-zinc-950" />
                  </span>
                )}
                <span className="text-2xl leading-none">{cfg.flag}</span>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-amber-400" : "text-zinc-100"}`}>
                    {cfg.name}
                  </p>
                  <p className="text-xs text-zinc-500">{cfg.country} · {cfg.code}</p>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  {new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.code, maximumFractionDigits: cfg.decimals }).format(12500)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Vista previa</p>
            <p className="text-sm text-zinc-300 mt-0.5">
              Activo: <span className="font-semibold text-zinc-100">{currencyConfig.flag} {currencyConfig.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-amber-400">{formatCurrency(1250000)}</p>
            <p className="text-xs text-zinc-500">{formatCurrency(89990)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
