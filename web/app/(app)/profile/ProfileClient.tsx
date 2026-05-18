"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/lib/ui";

export default function ProfileClient({
  initialName,
  initialEmail,
  initialAvatarUrl,
}: {
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    setAccountError(null);
    try {
      const fd = new window.FormData();
      fd.append("file", file);
      fd.append("folder", "profiles");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) { setAccountError(uploadData.error ?? "Upload failed"); return; }

      const newUrl = uploadData.url as string;
      const saveRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, avatarUrl: newUrl }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) { setAccountError(saveData.error ?? "Failed to save avatar"); return; }
      setAvatarUrl(newUrl);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(false);
    if (!name.trim()) { setAccountError("Name is required"); return; }
    if (!email.trim()) { setAccountError("Email is required"); return; }
    setAccountSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setAccountError(data.error ?? "Failed to save"); return; }
      setName(data.name);
      setEmail(data.email);
      setAccountSuccess(true);
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!currentPassword) { setPasswordError("Current password is required"); return; }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error ?? "Failed to update password"); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Account</p>
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group shrink-0"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-red/20 border border-red/30 flex items-center justify-center">
              <span className="text-lg font-bold text-red">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            {uploadingAvatar ? (
              <span className="text-xs text-off-white">…</span>
            ) : (
              <span className="text-xs text-off-white font-semibold">Edit</span>
            )}
          </div>
        </div>
        <div>
          <p className="font-semibold text-off-white">{name}</p>
          <p className="text-sm text-muted">{email}</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-xs text-red hover:underline mt-1 disabled:opacity-40"
          >
            {uploadingAvatar ? "Uploading…" : "Change photo"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Account details */}
        <form onSubmit={handleSaveAccount} className="bg-card rounded-xl border border-card p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold">Account Details</h2>
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">Name</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setAccountSuccess(false); }}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAccountSuccess(false); }}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </div>
          {accountError && <p className="text-sm text-red">{accountError}</p>}
          {accountSuccess && <p className="text-sm text-emerald-400">Changes saved.</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={accountSaving}
              className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {accountSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Change password */}
        <form onSubmit={handleChangePassword} className="bg-card rounded-xl border border-card p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold">Change Password</h2>
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSuccess(false); }}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false); }}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(false); }}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>
          {passwordError && <p className="text-sm text-red">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-400">Password updated.</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {passwordSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
