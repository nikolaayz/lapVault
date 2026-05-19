"use client";

import { useRef, useState, type ReactNode } from "react";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/lib/ui";
import { formatDate } from "@/lib/formatters";
import ClientPagination from "@/components/ui/ClientPagination";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

export type AdminTrack = {
  id: number;
  name: string;
  country: string;
  lengthKm: string | null;
  description: string | null;
  photoUrl: string | null;
  createdAt: string;
};

export type AdminRegistration = {
  id: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  userName: string;
  userEmail: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  trackName: string;
  carMake: string;
  carModel: string;
  carYear: number;
  carClass: string;
};

export type AdminStats = {
  userCount: number;
  eventCount: number;
  lapCount: number;
  pendingCount: number;
};

// ── Utilities ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type Tab = "overview" | "users" | "tracks" | "registrations";
type RegFilter = "all" | "pending" | "confirmed" | "cancelled";

interface TrackForm {
  name: string;
  country: string;
  lengthKm: string;
  description: string;
  photoUrl: string;
}

const emptyTrackForm: TrackForm = { name: "", country: "", lengthKm: "", description: "", photoUrl: "" };

type TrackModal =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; track: AdminTrack };

const statusBadge: Record<"pending" | "confirmed" | "cancelled", string> = {
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  confirmed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelled: "text-muted bg-muted/10 border-muted/20",
};

const roleBadge: Record<"user" | "admin", string> = {
  user: "text-muted bg-muted/10 border-muted/20",
  admin: "text-blue bg-blue/10 border-blue/20",
};

// ── Root component ─────────────────────────────────────────────────────────────

export default function AdminClient({
  currentUserId,
  initialUsers,
  initialTracks,
  initialRegistrations,
  stats,
}: {
  currentUserId: number;
  initialUsers: AdminUser[];
  initialTracks: AdminTrack[];
  initialRegistrations: AdminRegistration[];
  stats: AdminStats;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState(initialUsers);
  const [tracks, setTracks] = useState(initialTracks);
  const [regs, setRegs] = useState(initialRegistrations);
  const [regFilter, setRegFilter] = useState<RegFilter>("all");

  const [usersPage, setUsersPage] = useState(1);
  const [tracksPage, setTracksPage] = useState(1);
  const [regsPage, setRegsPage] = useState(1);

  const [trackModal, setTrackModal] = useState<TrackModal>({ open: false });
  const [trackForm, setTrackForm] = useState<TrackForm>(emptyTrackForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingTrackId, setDeletingTrackId] = useState<number | null>(null);
  const [updatingRegId, setUpdatingRegId] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleToggleRole(userId: number, currentRole: "user" | "admin") {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setTogglingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } finally {
      setTogglingId(null);
    }
  }

  function openCreate() {
    setTrackForm(emptyTrackForm);
    setFormError(null);
    setTrackModal({ open: true, mode: "create" });
  }

  function openEdit(track: AdminTrack) {
    setTrackForm({
      name: track.name,
      country: track.country,
      lengthKm: track.lengthKm ?? "",
      description: track.description ?? "",
      photoUrl: track.photoUrl ?? "",
    });
    setFormError(null);
    setTrackModal({ open: true, mode: "edit", track });
  }

  function closeTrackModal() {
    setTrackModal({ open: false });
    setFormError(null);
  }

  async function handleTrackPhotoUpload(file: File) {
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const fd = new window.FormData();
      fd.append("file", file);
      fd.append("folder", "tracks");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error ?? "Upload failed"); return; }
      setTrackForm((prev) => ({ ...prev, photoUrl: data.url }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveTrack() {
    if (!trackModal.open) return;
    if (!trackForm.name.trim() || !trackForm.country.trim()) {
      setFormError("Name and country are required");
      return;
    }

    const payload = {
      name: trackForm.name.trim(),
      country: trackForm.country.trim(),
      lengthKm: trackForm.lengthKm.trim() || null,
      description: trackForm.description.trim() || null,
      photoUrl: trackForm.photoUrl.trim() || null,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (trackModal.mode === "create") {
        const res = await fetch("/api/admin/tracks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to create track"); return; }
        const newTrack: AdminTrack = { id: data.id, createdAt: data.createdAt, ...payload };
        setTracks((prev) => [...prev, newTrack].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const res = await fetch(`/api/admin/tracks/${trackModal.track.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error ?? "Failed to update track"); return; }
        setTracks((prev) =>
          prev
            .map((t) => (t.id === (trackModal as { open: true; mode: "edit"; track: AdminTrack }).track.id ? { ...t, ...payload } : t))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
      closeTrackModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTrack(id: number) {
    setDeletingTrackId(id);
    try {
      const res = await fetch(`/api/admin/tracks/${id}`, { method: "DELETE" });
      if (res.ok) setTracks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingTrackId(null);
    }
  }

  async function handleUpdateRegStatus(id: number, status: "confirmed" | "cancelled") {
    setUpdatingRegId(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } finally {
      setUpdatingRegId(null);
    }
  }

  const filteredRegs = regFilter === "all" ? regs : regs.filter((r) => r.status === regFilter);

  function handleRegFilterChange(f: RegFilter) {
    setRegFilter(f);
    setRegsPage(1);
  }

  const pagedUsers = users.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);
  const pagedTracks = tracks.slice((tracksPage - 1) * PAGE_SIZE, tracksPage * PAGE_SIZE);
  const pagedRegs = filteredRegs.slice((regsPage - 1) * PAGE_SIZE, regsPage * PAGE_SIZE);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${users.length})` },
    { id: "tracks", label: `Tracks (${tracks.length})` },
    { id: "registrations", label: "Registrations" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-red mb-1">Admin</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Control Panel</h1>
      </div>

      <div className="flex border-b border-card gap-6">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === id
                ? "text-off-white border-red"
                : "text-muted border-transparent hover:text-off-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewSection stats={stats} />}

      {tab === "users" && (
        <UsersSection
          users={pagedUsers}
          total={users.length}
          page={usersPage}
          totalPages={Math.ceil(users.length / PAGE_SIZE)}
          onPageChange={setUsersPage}
          currentUserId={currentUserId}
          togglingId={togglingId}
          onToggleRole={handleToggleRole}
        />
      )}

      {tab === "tracks" && (
        <TracksSection
          tracks={pagedTracks}
          total={tracks.length}
          page={tracksPage}
          totalPages={Math.ceil(tracks.length / PAGE_SIZE)}
          onPageChange={setTracksPage}
          deletingId={deletingTrackId}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={handleDeleteTrack}
        />
      )}

      {tab === "registrations" && (
        <RegistrationsSection
          regs={pagedRegs}
          filter={regFilter}
          totalCounts={{
            all: regs.length,
            pending: regs.filter((r) => r.status === "pending").length,
            confirmed: regs.filter((r) => r.status === "confirmed").length,
            cancelled: regs.filter((r) => r.status === "cancelled").length,
          }}
          total={filteredRegs.length}
          page={regsPage}
          totalPages={Math.ceil(filteredRegs.length / PAGE_SIZE)}
          onPageChange={setRegsPage}
          updatingId={updatingRegId}
          onFilterChange={handleRegFilterChange}
          onUpdateStatus={handleUpdateRegStatus}
        />
      )}

      {trackModal.open && (
        <TrackModalDialog
          mode={trackModal.mode}
          form={trackForm}
          onChange={setTrackForm}
          onSave={handleSaveTrack}
          onClose={closeTrackModal}
          onPhotoUpload={handleTrackPhotoUpload}
          saving={saving}
          uploadingPhoto={uploadingPhoto}
          error={formError}
        />
      )}
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────

function OverviewSection({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: "Total Users", value: stats.userCount, accent: "border-red" },
    { label: "Total Events", value: stats.eventCount, accent: "border-red" },
    { label: "Total Laps", value: stats.lapCount, accent: "border-red" },
    {
      label: "Pending Registrations",
      value: stats.pendingCount,
      accent: stats.pendingCount > 0 ? "border-amber-400" : "border-card",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, accent }) => (
        <div key={label} className={`bg-card rounded-lg p-6 border-l-[3px] ${accent}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">{label}</p>
          <p className="text-3xl font-bold font-mono">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────

function UsersSection({
  users,
  total,
  page,
  totalPages,
  onPageChange,
  currentUserId,
  togglingId,
  onToggleRole,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  currentUserId: number;
  togglingId: number | null;
  onToggleRole: (userId: number, currentRole: "user" | "admin") => void;
}) {
  if (total === 0) {
    return <p className="text-sm text-muted">No users found.</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="bg-card rounded-xl border border-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-card">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-carbon/40 transition-colors">
                <td className="px-5 py-3 font-medium text-off-white">{user.name}</td>
                <td className="px-5 py-3 text-muted">{user.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${roleBadge[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted">{formatDate(user.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onToggleRole(user.id, user.role)}
                      disabled={togglingId === user.id}
                      className="text-xs text-muted hover:text-off-white transition-colors px-2 py-1 rounded hover:bg-off-white/5 disabled:opacity-40"
                    >
                      {togglingId === user.id
                        ? "Saving…"
                        : user.role === "admin"
                        ? "Revoke admin"
                        : "Make admin"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ClientPagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}

// ── Tracks ─────────────────────────────────────────────────────────────────────

function TracksSection({
  tracks,
  total,
  page,
  totalPages,
  onPageChange,
  deletingId,
  onAdd,
  onEdit,
  onDelete,
}: {
  tracks: AdminTrack[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  deletingId: number | null;
  onAdd: () => void;
  onEdit: (track: AdminTrack) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          className="bg-red text-off-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
        >
          + Add Track
        </button>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted">No tracks yet.</p>
          <p className="text-xs text-muted mt-1">Add the first track to get started.</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card">
                  <Th>Name</Th>
                  <Th>Country</Th>
                  <Th>Length</Th>
                  <Th>Description</Th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-card">
                {tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-carbon/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-off-white">{track.name}</td>
                    <td className="px-5 py-3 text-muted">{track.country}</td>
                    <td className="px-5 py-3 text-muted">{track.lengthKm ? `${track.lengthKm} km` : "—"}</td>
                    <td className="px-5 py-3 text-muted max-w-xs truncate">{track.description ?? "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(track)}
                          className="text-xs text-muted hover:text-off-white transition-colors px-2 py-1 rounded hover:bg-off-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(track.id)}
                          disabled={deletingId === track.id}
                          className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40"
                        >
                          {deletingId === track.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ClientPagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}

// ── Track modal ────────────────────────────────────────────────────────────────

function TrackModalDialog({
  mode,
  form,
  onChange,
  onSave,
  onClose,
  onPhotoUpload,
  saving,
  uploadingPhoto,
  error,
}: {
  mode: "create" | "edit";
  form: TrackForm;
  onChange: (f: TrackForm) => void;
  onSave: () => void;
  onClose: () => void;
  onPhotoUpload: (file: File) => void;
  saving: boolean;
  uploadingPhoto: boolean;
  error: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function set(key: keyof TrackForm, value: string) {
    onChange({ ...form, [key]: value });
  }

  const canSave = !!(form.name.trim() && form.country.trim() && !saving && !uploadingPhoto);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 border border-card max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold">{mode === "create" ? "Add Track" : "Edit Track"}</h2>

        {/* Photo upload */}
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-36 rounded-lg border border-dashed border-card bg-carbon overflow-hidden cursor-pointer hover:border-red/40 transition-colors group"
        >
          {form.photoUrl ? (
            <>
              <img src={form.photoUrl} alt="Track photo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-xs font-semibold text-off-white">Change photo</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1.5">
              <p className="text-2xl opacity-30">🏁</p>
              <p className="text-xs text-muted">Click to upload a photo</p>
              <p className="text-xs text-muted/60">JPEG, PNG, WebP · max 5 MB</p>
            </div>
          )}
          {uploadingPhoto && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <p className="text-xs text-off-white">Uploading…</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhotoUpload(file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nürburgring"
              className={inputClass}
            />
          </Field>
          <Field label="Country" required>
            <input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Germany"
              className={inputClass}
            />
          </Field>
          <Field label="Length (km)">
            <input
              value={form.lengthKm}
              onChange={(e) => set("lengthKm", e.target.value)}
              placeholder="20.8"
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Classic circuit known for..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-off-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="bg-red text-off-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving…" : mode === "create" ? "Add Track" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Registrations ──────────────────────────────────────────────────────────────

function RegistrationsSection({
  regs,
  filter,
  totalCounts,
  total,
  page,
  totalPages,
  onPageChange,
  updatingId,
  onFilterChange,
  onUpdateStatus,
}: {
  regs: AdminRegistration[];
  filter: RegFilter;
  totalCounts: Record<RegFilter, number>;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  updatingId: number | null;
  onFilterChange: (f: RegFilter) => void;
  onUpdateStatus: (id: number, status: "confirmed" | "cancelled") => void;
}) {
  const filters: { id: RegFilter; label: string }[] = [
    { id: "all", label: `All (${totalCounts.all})` },
    { id: "pending", label: `Pending (${totalCounts.pending})` },
    { id: "confirmed", label: `Confirmed (${totalCounts.confirmed})` },
    { id: "cancelled", label: `Cancelled (${totalCounts.cancelled})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === id
                ? "text-off-white border-red bg-red/10"
                : "text-muted border-card hover:border-off-white/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted">
            No registrations{filter !== "all" ? ` with status "${filter}"` : ""}.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-card overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-card">
                  <Th>User</Th>
                  <Th>Event</Th>
                  <Th>Car</Th>
                  <Th>Status</Th>
                  <Th>Registered</Th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-card">
                {regs.map((reg) => (
                  <tr key={reg.id} className="hover:bg-carbon/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-off-white">{reg.userName}</p>
                      <p className="text-xs text-muted">{reg.userEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-off-white">{reg.eventTitle}</p>
                      <p className="text-xs text-muted">
                        {reg.trackName} · {formatDate(reg.eventDate)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-off-white">
                        {reg.carYear} {reg.carMake} {reg.carModel}
                      </p>
                      <p className="text-xs text-muted">{reg.carClass}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusBadge[reg.status]}`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(reg.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {reg.status !== "confirmed" && (
                          <button
                            onClick={() => onUpdateStatus(reg.id, "confirmed")}
                            disabled={updatingId === reg.id}
                            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded hover:bg-emerald-400/5 disabled:opacity-40"
                          >
                            Confirm
                          </button>
                        )}
                        {reg.status !== "cancelled" && (
                          <button
                            onClick={() => onUpdateStatus(reg.id, "cancelled")}
                            disabled={updatingId === reg.id}
                            className="text-xs text-muted hover:text-red transition-colors px-2 py-1 rounded hover:bg-red/5 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ClientPagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────────

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="text-left text-xs font-semibold uppercase tracking-widest text-muted px-5 py-3">
      {children}
    </th>
  );
}

