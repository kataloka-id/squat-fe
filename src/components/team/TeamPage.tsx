import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Briefcase, RefreshCw, Users } from 'lucide-react';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import type { ProjectAssignmentRecord, ProjectMemberRecord } from '@/src/types/api.ts';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';

type ProjectTeam = { project: ProjectAssignmentRecord; members: ProjectMemberRecord[] };

export const TeamPage = ({ onManageAssignments }: { onManageAssignments: () => void }) => {
  const isAdmin = useSessionUser()?.roleSlug.toLowerCase() === 'admin';
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async (force = false) => {
    const token = ++request.current;
    setLoading(true); setError(null);
    try {
      // Both admin and non-admin use this scoped endpoint. A non-admin never
      // needs a global user directory to see their project teams.
      const options = force ? { force: true } : undefined;
      const projects = (await ProjectsService.list(options)).data;
      const members = await Promise.all(projects.map(async (project) => ({
        project,
        members: (await ProjectsService.listMembers(project.id, options)).data,
      })));
      if (request.current === token) setTeams(members);
    } catch (cause) {
      if (request.current === token) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Team tidak dapat dimuat.');
    } finally { if (request.current === token) setLoading(false); }
  }, []);

  useEffect(() => { void load(); return () => { request.current += 1; }; }, [load]);

  return <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in duration-300">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Team</h1><p className="mt-1 text-sm text-slate-500">Anggota dikelompokkan berdasarkan project yang dapat Anda akses.</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => void load(true)} disabled={loading} icon={<RefreshCw size={16} />}>Muat ulang</Button>{isAdmin && <Button onClick={onManageAssignments}>Kelola assignment</Button>}</div>
    </div>
    {isAdmin ? <p className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">Sebagai admin, Anda dapat menambah atau menghapus assignment anggota melalui Settings.</p> : <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">Akses Team bersifat view-only. Hubungi admin untuk perubahan assignment.</p>}
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={18}/>{error}</div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Memuat team…</div> : teams.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Belum ada project yang dapat diakses.</div> : <div className="grid gap-5 md:grid-cols-2">{teams.map(({ project, members }) => <section key={project.id} className="rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex items-center gap-3 border-b border-slate-100 p-5"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Briefcase size={19}/></div><div><h2 className="font-semibold text-slate-900">{project.name}</h2><p className="text-xs text-slate-500">{project.key ?? 'Project'} · {members.length} anggota</p></div></header><ul className="divide-y divide-slate-100">{members.length ? members.map((member, index) => { const email = member.email ?? member.userEmail; const name = member.username ?? 'Anggota team'; return <li key={member.id ?? member.userId ?? `${project.id}-${index}`} className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{name}</p>{email && <p className="truncate text-xs text-slate-500">{email}</p>}</div>{(member.roleSlug ?? member.role) && <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{member.roleSlug ?? member.role}</span>}</li>; }) : <li className="p-5 text-sm text-slate-500">Belum ada anggota yang di-assign.</li>}</ul></section>)}</div>}
    {!loading && !error && teams.length > 0 && <div className="sr-only"><Users /></div>}
  </div>;
};
