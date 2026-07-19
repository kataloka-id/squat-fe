import { Fragment, FormEvent, type InputHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Save, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { RolesService, UsersService, type UserPayload } from '@/src/api/users.service.ts';
import type { RoleRecord, UserRecord } from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';

type Notice = { type: 'success' | 'error'; message: string } | null;
type UserEditor = Pick<UserRecord, 'id' | 'email' | 'username' | 'roleSlug' | 'isActive'> & { password: string };
const errorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Request gagal. Coba lagi.';

const Field = ({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <input
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100"
    />
  </label>
);

export const SettingsPage = () => {
  const sessionUser = useSessionUser();
  const sessionUserId = sessionUser?.id;
  const isAdmin = sessionUser?.roleSlug.toLowerCase() === 'admin';
  const [me, setMe] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [profile, setProfile] = useState({ email: '', username: '', password: '' });
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', roleSlug: 'qa' });
  const [newRole, setNewRole] = useState({ slug: '', name: '', description: '' });
  const [editingUser, setEditingUser] = useState<UserEditor | null>(null);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isCurrentLoad = () => loadGeneration.current === generation;
    if (!sessionUserId) return;
    setLoading(true);
    setNotice(null);
    try {
      // User data is fetched only for administrators. Client-side hiding is not
      // an authorization boundary; the API also enforces this restriction.
      const meResponse = await UsersService.getMe();
      if (!isCurrentLoad()) return;
      setMe(meResponse.data);
      setProfile({ email: meResponse.data.email, username: meResponse.data.username ?? '', password: '' });
      if (isAdmin) {
        const [rolesResponse, usersResponse] = await Promise.all([
          RolesService.list(),
          UsersService.list(),
        ]);
        if (!isCurrentLoad()) return;
        setRoles(rolesResponse.data);
        setUsers(usersResponse.data);
      } else {
        // Non-admin Settings is strictly self-service: do not request data
        // about roles or other accounts, even though those sections are hidden.
        setRoles([]);
        setUsers([]);
      }
    } catch (error) {
      if (isCurrentLoad()) setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  }, [isAdmin, sessionUserId]);

  useEffect(() => {
    void load();
    return () => {
      // Prevent a completed request from an unmounted/previous session view
      // from committing its response after React remounts Settings.
      loadGeneration.current += 1;
    };
  }, [load]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const payload: UserPayload = { email: profile.email, username: profile.username };
    if (profile.password) payload.password = profile.password;
    setSaving(true);
    try {
      const response = await UsersService.updateMe(payload);
      setMe(response.data);
      setProfile((current) => ({ ...current, password: '' }));
      setNotice({ type: 'success', message: 'Profil Anda berhasil diperbarui.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await UsersService.create({ ...newUser, isActive: true });
      setNewUser({ email: '', username: '', password: '', roleSlug: 'qa' });
      setNotice({ type: 'success', message: 'Akun baru dibuat.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const beginUserEdit = (user: UserRecord) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      username: user.username,
      roleSlug: user.roleSlug,
      isActive: user.isActive,
      password: '',
    });
  };

  const saveUserEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    const payload: UserPayload = {
      email: editingUser.email,
      username: editingUser.username,
      roleSlug: editingUser.roleSlug,
      isActive: editingUser.isActive,
    };
    if (editingUser.password) payload.password = editingUser.password;

    setSaving(true);
    try {
      await UsersService.update(editingUser.id, payload);
      setEditingUser(null);
      setNotice({ type: 'success', message: 'Akun diperbarui.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const deleteUser = async (user: UserRecord) => {
    if (!window.confirm(`Hapus akun ${user.email}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setSaving(true);
    try {
      await UsersService.remove(user.id);
      setNotice({ type: 'success', message: 'Akun dihapus.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await RolesService.create(newRole);
      setNewRole({ slug: '', name: '', description: '' });
      setNotice({ type: 'success', message: 'Role dibuat.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const deleteRole = async (role: RoleRecord) => {
    if (!window.confirm(`Hapus role ${role.slug}?`)) return;
    setSaving(true);
    try {
      await RolesService.remove(role.slug);
      setNotice({ type: 'success', message: 'Role dihapus.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const editRole = async (role: RoleRecord) => {
    const name = window.prompt('Nama role', role.name ?? role.slug);
    if (name === null || !name.trim()) return;
    const description = window.prompt('Deskripsi role', role.description ?? '');
    if (description === null) return;
    setSaving(true);
    try {
      await RolesService.update(role.slug, { name: name.trim(), description: description.trim() });
      setNotice({ type: 'success', message: 'Role diperbarui.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in duration-300">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Settings</h1><p className="mt-1 text-sm text-slate-500">Kelola profil dan akses workspace.</p></div>
      <Button variant="secondary" onClick={() => void load()} disabled={loading || saving} icon={<RefreshCw size={16} />}>Muat ulang</Button>
    </div>
    {notice && <div role="alert" className={`flex gap-2 rounded-lg border p-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><AlertCircle size={18} />{notice.message}</div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Memuat pengaturan…</div> : <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><UserCog size={20} /></div><div><h2 className="font-semibold text-slate-900">Profil saya</h2><p className="text-sm text-slate-500">Perbarui email, username, atau kata sandi Anda.</p></div></div>
        <form onSubmit={saveProfile} className="grid max-w-2xl gap-4 sm:grid-cols-2"><Field label="Email" type="email" required autoComplete="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} /><div className="sm:col-span-2"><Field label="Kata sandi baru (opsional)" type="password" minLength={8} autoComplete="new-password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} /></div><div className="sm:col-span-2"><Button type="submit" disabled={saving} icon={<Save size={16} />}>Simpan profil</Button></div></form>
      </section>
      {isAdmin && <>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Users size={20} /></div><div><h2 className="font-semibold text-slate-900">Akun pengguna</h2><p className="text-sm text-slate-500">Buat dan kelola akses anggota workspace.</p></div></div>
          <form onSubmit={createUser} className="mb-6 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-5"><Field label="Email" type="email" required autoComplete="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} /><Field label="Kata sandi" type="password" required minLength={8} autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /><label className="block text-sm font-medium text-slate-700">Role<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={newUser.roleSlug} onChange={(e) => setNewUser({ ...newUser, roleSlug: e.target.value })}>{roles.map((role) => <option key={role.slug} value={role.slug}>{role.name ?? role.slug}</option>)}</select></label><div className="flex items-end"><Button type="submit" disabled={saving} icon={<Plus size={16} />}>Tambah</Button></div></form>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Pengguna</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody>{users.map((user) => <Fragment key={user.id}>
            <tr key={user.id} className="border-b"><td className="p-3"><div className="font-medium text-slate-800">{user.username}</div><div className="text-slate-500">{user.email}</div></td><td className="p-3">{user.roleSlug}</td><td className="p-3">{user.isActive ? 'Aktif' : 'Nonaktif'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => beginUserEdit(user)} icon={<Pencil size={15} />}>Ubah</Button><Button variant="danger" size="sm" disabled={saving || user.id === me?.id} onClick={() => void deleteUser(user)} icon={<Trash2 size={15} />}>Hapus</Button></div></td></tr>
            {editingUser?.id === user.id && <tr key={`${user.id}-editor`} className="border-b bg-slate-50"><td colSpan={4} className="p-4"><form onSubmit={saveUserEdit} className="grid gap-3 md:grid-cols-2"><Field label="Email" type="email" required autoComplete="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} /><Field label="Kata sandi baru (opsional)" type="password" minLength={8} autoComplete="new-password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /><label className="block text-sm font-medium text-slate-700">Role<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={editingUser.roleSlug} onChange={(e) => setEditingUser({ ...editingUser, roleSlug: e.target.value })}>{roles.map((role) => <option key={role.slug} value={role.slug}>{role.name ?? role.slug}</option>)}</select></label><label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={editingUser.isActive} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })} />Akun aktif</label><div className="flex items-end justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => setEditingUser(null)}>Batal</Button><Button type="submit" disabled={saving} icon={<Save size={16} />}>Simpan akun</Button></div></form></td></tr>}
          </Fragment>)}</tbody></table></div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Shield size={20} /></div><div><h2 className="font-semibold text-slate-900">Role</h2><p className="text-sm text-slate-500">Tambahkan role untuk penugasan akun mendatang.</p></div></div><form onSubmit={createRole} className="mb-4 grid gap-3 md:grid-cols-4"><Field label="Slug" required pattern="[a-z0-9-]+" title="Gunakan huruf kecil, angka, atau tanda hubung" value={newRole.slug} onChange={(e) => setNewRole({ ...newRole, slug: e.target.value })} /><Field label="Nama" required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} /><Field label="Deskripsi" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} /><div className="flex items-end"><Button type="submit" disabled={saving} icon={<Plus size={16} />}>Tambah role</Button></div></form><ul className="divide-y rounded-lg border border-slate-200">{roles.map((role) => <li key={role.slug} className="flex items-center justify-between gap-4 p-3"><div><span className="font-medium text-slate-800">{role.name ?? role.slug}</span><span className="ml-2 text-xs text-slate-500">{role.slug}</span>{role.description && <p className="text-sm text-slate-500">{role.description}</p>}</div><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => void editRole(role)}>Ubah</Button><Button variant="danger" size="sm" disabled={saving || role.slug === 'admin'} onClick={() => void deleteRole(role)} icon={<Trash2 size={15} />}>Hapus</Button></div></li>)}</ul></section>
      </>}
    </>}
  </div>;
};
