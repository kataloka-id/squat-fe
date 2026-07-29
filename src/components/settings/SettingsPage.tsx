import { Fragment, FormEvent, type InputHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Save, Shield, Trash2, UserCog, Users, X } from 'lucide-react';
import { RolesService, UsersService, type UserPayload } from '@/src/api/users.service.ts';
import { CompaniesService } from '@/src/api/companies.service.ts';
import { ProjectsService, SectionsService } from '@/src/api/projects.service.ts';
import type { CompanyDetailsRecord, CompanyRecord, EnterpriseCategoryRecord, EnterpriseTypeRecord, ManagedCompanyRecord, ProjectAssignmentRecord, RoleRecord, SectionRecord, UserRecord } from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { CompanyLogo } from '@/src/components/company/CompanyLogo.tsx';
import { DEFAULT_COMPANY_BRAND } from '@/src/components/company/company-brand.ts';

type Notice = { type: 'success' | 'error'; message: string } | null;
type UserEditor = Pick<UserRecord, 'id' | 'email' | 'username' | 'roleSlug' | 'isActive'> & { password: string };
const errorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Request gagal. Coba lagi.';
const createUserErrorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error && String(error.message).trim()
    ? String(error.message)
    : 'Gagal menambahkan akun pengguna.';
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ROLE_SLUG = /^[a-z0-9-]{2,50}$/;

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
  const roleSlug = sessionUser?.roleSlug.toLowerCase();
  const isKatalokaAdmin = roleSlug === 'kataloka_admin';
  const isCompanyAdmin = roleSlug === 'admin';
  const isAdmin = isKatalokaAdmin || isCompanyAdmin;
  const canEditCompanyProfile = isCompanyAdmin && !isKatalokaAdmin;
  const [me, setMe] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [projects, setProjects] = useState<ProjectAssignmentRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [profile, setProfile] = useState({ email: '', username: '', password: '' });
  const [company, setCompany] = useState<CompanyRecord | null>(sessionUser?.company ?? null);
  const [companyProfile, setCompanyProfile] = useState({ name: '', profileColour: DEFAULT_COMPANY_BRAND });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [managedCompanies, setManagedCompanies] = useState<ManagedCompanyRecord[]>([]);
  const [categories, setCategories] = useState<EnterpriseCategoryRecord[]>([]);
  const [enterpriseTypes, setEnterpriseTypes] = useState<EnterpriseTypeRecord[]>([]);
  const [newCompany, setNewCompany] = useState({ name: '', businessType: '', category: '', address: '', phone: '', email: '', field: '', postalCode: '' });
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', roleSlug: 'qa', companyId: '' });
  const [userFilters, setUserFilters] = useState({ q: '', companyId: '' });
  const [appliedUserFilters, setAppliedUserFilters] = useState({ q: '', companyId: '' });
  const [companyDetail, setCompanyDetail] = useState<ManagedCompanyRecord | null>(null);
  const [details, setDetails] = useState<CompanyDetailsRecord | null>(null);
  const [newType, setNewType] = useState({ id: '', businessType: '', description: '', legalEntity: false, isActive: true });
  const [newCategory, setNewCategory] = useState({ id: '', code: '', name: '', description: '', isActive: true });
  const [editingMaster, setEditingMaster] = useState<{ kind: 'type' | 'category'; id: number } | null>(null);
  const [newRole, setNewRole] = useState({ slug: '', name: '', description: '' });
  const [editingUser, setEditingUser] = useState<UserEditor | null>(null);
  const [assignmentUser, setAssignmentUser] = useState<UserRecord | null>(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const loadGeneration = useRef(0);
  const creatingUser = useRef(false);

  const load = useCallback(async (force = false) => {
    const generation = ++loadGeneration.current;
    const isCurrentLoad = () => loadGeneration.current === generation;
    if (!sessionUserId) return;
    setLoading(true);
    setNotice(null);
    try {
      // User data is fetched only for administrators. Client-side hiding is not
      // an authorization boundary; the API also enforces this restriction.
      const options = force ? { force: true } : undefined;
      const [meResult, companyResult] = await Promise.allSettled([UsersService.getMe(options), CompaniesService.getProfile(options)]);
      if (!isCurrentLoad()) return;
      if (meResult.status === 'rejected') throw meResult.reason;
      const meResponse = meResult.value;
      setMe(meResponse.data);
      setProfile({ email: meResponse.data.email, username: meResponse.data.username ?? '', password: '' });
      if (companyResult.status === 'fulfilled') {
        setCompany(companyResult.value.data);
        setCompanyProfile({
          name: companyResult.value.data.name,
          profileColour: companyResult.value.data.profileColour ?? DEFAULT_COMPANY_BRAND,
        });
      } else {
        setCompany(null);
        setNotice({ type: 'error', message: `Company Profile tidak tersedia: ${errorMessage(companyResult.reason)}` });
      }
      if (!isKatalokaAdmin) {
        const [detailsResponse, categoriesResponse, typesResponse] = await Promise.all([
          CompaniesService.getDetails(), CompaniesService.listCategories(false), CompaniesService.listTypes(false),
        ]);
        if (!isCurrentLoad()) return;
        setDetails(detailsResponse.data);
        setCategories(categoriesResponse.data);
        setEnterpriseTypes(typesResponse.data);
      } else setDetails(null);
      if (isAdmin) {
        const roleRequest = isKatalokaAdmin ? RolesService.list(options) : RolesService.assignable(options);
        const [rolesResponse, usersResponse, projectsResponse, sectionsResponse] = await Promise.all([
          roleRequest.catch(() => null),
          // The server scopes this sensitive list from the current session.
          // Do not reuse a list cached under an earlier permission context.
          UsersService.list({ force: true }, { q: appliedUserFilters.q, ...(isKatalokaAdmin ? { companyId: appliedUserFilters.companyId } : {}) }),
          ProjectsService.list(options),
          SectionsService.list(options),
        ]);
        if (!isCurrentLoad()) return;
        setRoles(rolesResponse?.data ?? []);
        setUsers(usersResponse.data);
        setProjects(projectsResponse.data);
        setSections(sectionsResponse.data);
        if (isKatalokaAdmin) {
          const [companiesResponse, categoriesResponse, typesResponse] = await Promise.all([
            CompaniesService.listManaged(options), CompaniesService.listCategories(false), CompaniesService.listTypes(false),
          ]);
          if (!isCurrentLoad()) return;
          setManagedCompanies(companiesResponse.data);
          setCategories(categoriesResponse.data);
          setEnterpriseTypes(typesResponse.data);
        } else {
          setManagedCompanies([]);
        }
      } else {
        // Non-admin Settings is strictly self-service: do not request data
        // about roles or other accounts, even though those sections are hidden.
        setRoles([]);
        setUsers([]);
        setProjects([]);
        setSections([]);
      }
    } catch (error) {
      if (isCurrentLoad()) setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  }, [appliedUserFilters, isAdmin, isKatalokaAdmin, sessionUserId]);

  useEffect(() => {
    void load();
    return () => {
      // Prevent a completed request from an unmounted/previous session view
      // from committing its response after React remounts Settings.
      loadGeneration.current += 1;
    };
  }, [load]);

  useEffect(() => () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
  }, [logoPreviewUrl]);

  useEffect(() => {
    const availableRoles = roles.filter((role) =>
      role.isActive !== false
      && role.slug.toLowerCase() !== 'kataloka_admin'
      && (isKatalokaAdmin || role.slug.toLowerCase() === 'qa'),
    );
    setNewUser((current) =>
      availableRoles.some((role) => role.slug.toLowerCase() === current.roleSlug.toLowerCase())
        ? current
        : { ...current, roleSlug: availableRoles[0]?.slug ?? '' },
    );
  }, [isKatalokaAdmin, roles]);

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

  const saveCompanyProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEditCompanyProfile || !company) return;
    const name = companyProfile.name.trim();
    if (!name || !HEX_COLOUR.test(companyProfile.profileColour)) {
      setNotice({ type: 'error', message: 'Masukkan nama perusahaan dan warna hex 6 digit.' });
      return;
    }
    setSaving(true);
    try {
      const response = await CompaniesService.updateProfile({ name, profileColour: companyProfile.profileColour });
      setCompany(response.data);
      setCompanyProfile({ name: response.data.name, profileColour: response.data.profileColour ?? DEFAULT_COMPANY_BRAND });
      window.dispatchEvent(new CustomEvent<CompanyRecord>('company-profile-updated', { detail: response.data }));
      setNotice({ type: 'success', message: 'Company Profile berhasil diperbarui.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const selectLogo = (file: File | null) => {
    if (!file) return;
    if (!LOGO_TYPES.has(file.type) || file.size > MAX_LOGO_BYTES) {
      setNotice({ type: 'error', message: 'Logo harus PNG, JPEG, atau WebP dengan ukuran maksimal 2 MB.' });
      return;
    }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const uploadLogo = async () => {
    if (!canEditCompanyProfile || !company || !logoFile) return;
    setSaving(true);
    try {
      const response = await CompaniesService.uploadLogo(logoFile);
      const updatedCompany = { ...company, ...response.data };
      setCompany(updatedCompany);
      window.dispatchEvent(new CustomEvent<CompanyRecord>('company-profile-updated', { detail: updatedCompany }));
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null); setLogoFile(null);
      setNotice({ type: 'success', message: 'Logo perusahaan berhasil diperbarui.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const removeLogo = async () => {
    if (!canEditCompanyProfile || !company || !company.hasLogo) return;
    setSaving(true);
    try {
      const response = await CompaniesService.removeLogo();
      const updatedCompany = { ...company, ...response.data };
      setCompany(updatedCompany);
      window.dispatchEvent(new CustomEvent<CompanyRecord>('company-profile-updated', { detail: updatedCompany }));
      setNotice({ type: 'success', message: 'Logo perusahaan dihapus.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || creatingUser.current) return;
    const email = newUser.email.trim();
    const username = newUser.username.trim();
    if (!email || !username || !newUser.password || newUser.password.length < 8) {
      setNotice({ type: 'error', message: 'Lengkapi seluruh field akun pengguna yang wajib.' });
      return;
    }
    const selectedRole = newUser.roleSlug.toLowerCase();
    const allowedRoles = isKatalokaAdmin
      ? assignableRoles
      : assignableRoles.filter((role) => role.slug.toLowerCase() === 'qa');
    if (!allowedRoles.some((role) => role.slug.toLowerCase() === selectedRole)) {
      setNotice({ type: 'error', message: isKatalokaAdmin ? 'Pilih role aktif selain Kataloka Admin.' : 'Admin company hanya dapat membuat akun dengan role QA.' });
      return;
    }
    if (isKatalokaAdmin && !newUser.companyId) {
      setNotice({ type: 'error', message: 'Pilih company untuk akun baru.' });
      return;
    }
    creatingUser.current = true;
    setSaving(true);
    try {
      const { companyId, ...payload } = newUser;
      await UsersService.create({ ...payload, email, username, isActive: true, ...(isKatalokaAdmin ? { companyId } : {}) });
      setNewUser({ email: '', username: '', password: '', roleSlug: 'qa', companyId: '' });
      await load(true);
      setNotice({ type: 'success', message: 'Akun pengguna berhasil ditambahkan.' });
    } catch (error) { setNotice({ type: 'error', message: createUserErrorMessage(error) }); }
    finally { creatingUser.current = false; setSaving(false); }
  };

  const createCompany = async (event: FormEvent) => {
    event.preventDefault();
    if (!isKatalokaAdmin) return;
    if (!newCompany.name.trim() || !newCompany.businessType || !newCompany.category || !newCompany.address.trim() || !newCompany.phone.trim() || !newCompany.field.trim() || !newCompany.postalCode.trim()) {
      setNotice({ type: 'error', message: 'Lengkapi seluruh field company yang wajib.' }); return;
    }
    setSaving(true);
    try {
      await CompaniesService.createManaged({ name: newCompany.name.trim(), businessType: Number(newCompany.businessType), category: Number(newCompany.category), address: newCompany.address.trim(), phone: newCompany.phone.trim(), email: newCompany.email.trim() || null, field: newCompany.field.trim(), postalCode: newCompany.postalCode.trim() });
      setNewCompany({ name: '', businessType: '', category: '', address: '', phone: '', email: '', field: '', postalCode: '' });
      setNotice({ type: 'success', message: 'Company berhasil dibuat.' }); await load(true);
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const updateCompanyStatus = async (managedCompany: ManagedCompanyRecord) => {
    if (!isKatalokaAdmin) return;
    setSaving(true);
    try { await CompaniesService.updateManagedStatus(managedCompany.id, !managedCompany.isActive); setNotice({ type: 'success', message: `Company ${managedCompany.isActive ? 'diarsipkan' : 'diaktifkan'}.` }); await load(true); }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const viewCompany = async (id: string) => {
    if (!isKatalokaAdmin) return;
    try { setCompanyDetail((await CompaniesService.getManaged(id)).data); }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
  };

  const deleteCompany = async (managedCompany: ManagedCompanyRecord) => {
    if (!isKatalokaAdmin || managedCompany.isActive) return;
    if (!window.confirm(`Hapus company ${managedCompany.name}?`)) return;
    setSaving(true);
    try { await CompaniesService.deleteManaged(managedCompany.id); setCompanyDetail((current) => current?.id === managedCompany.id ? null : current); setNotice({ type: 'success', message: 'Company berhasil dihapus.' }); await load(true); }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault(); if (!isCompanyAdmin || !details) return;
    setSaving(true);
    try { const response = await CompaniesService.updateDetails({ name: details.name, businessType: details.businessType, category: details.category, address: details.address, phone: details.phone, email: details.email, field: details.field, postalCode: details.postalCode, profileColour: details.profileColour }); setDetails(response.data); setNotice({ type: 'success', message: 'Detail company berhasil diperbarui.' }); }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); } finally { setSaving(false); }
  };

  const createMaster = async (kind: 'type' | 'category', event: FormEvent) => {
    event.preventDefault(); if (!isKatalokaAdmin) return; setSaving(true);
    try {
      if (kind === 'type') {
        const payload = { businessType: newType.businessType.trim(), description: newType.description.trim() || null, legalEntity: newType.legalEntity, isActive: newType.isActive };
        if (editingMaster?.kind === 'type') await CompaniesService.updateType(editingMaster.id, payload);
        else await CompaniesService.createType({ id: Number(newType.id), ...payload });
        setNewType({ id: '', businessType: '', description: '', legalEntity: false, isActive: true });
      } else {
        const payload = { code: newCategory.code.trim(), name: newCategory.name.trim(), description: newCategory.description.trim(), isActive: newCategory.isActive };
        if (editingMaster?.kind === 'category') await CompaniesService.updateCategory(editingMaster.id, payload);
        else await CompaniesService.createCategory({ id: Number(newCategory.id), ...payload });
        setNewCategory({ id: '', code: '', name: '', description: '', isActive: true });
      }
      setEditingMaster(null);
      await load(true);
    }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); } finally { setSaving(false); }
  };
  const removeMaster = async (kind: 'type' | 'category', id: number) => {
    if (!isKatalokaAdmin || !window.confirm('Hapus master ini?')) return; setSaving(true);
    try { if (kind === 'type') await CompaniesService.deleteType(id); else await CompaniesService.deleteCategory(id); await load(true); }
    catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); } finally { setSaving(false); }
  };
  const editMaster = (kind: 'type' | 'category', item: EnterpriseTypeRecord | EnterpriseCategoryRecord) => {
    if (!isKatalokaAdmin) return;
    if (kind === 'type') {
      const type = item as EnterpriseTypeRecord;
      setNewType({ id: String(type.id), businessType: type.businessType, description: type.description ?? '', legalEntity: Boolean(type.legalEntity), isActive: type.isActive });
    } else {
      const category = item as EnterpriseCategoryRecord;
      setNewCategory({ id: String(category.id), code: category.code, name: category.name, description: category.description ?? '', isActive: category.isActive });
    }
    setEditingMaster({ kind, id: item.id });
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

  const openAssignments = async (user: UserRecord) => {
    setAssignmentUser(user); setAssignedProjectIds([]); setAssignmentLoading(true); setNotice(null);
    try {
      const response = await UsersService.getProjectAssignments(user.id);
      setAssignedProjectIds(response.data.projectIds);
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setAssignmentLoading(false); }
  };

  const saveAssignments = async () => {
    if (!assignmentUser) return;
    setSaving(true);
    try {
      await UsersService.updateProjectAssignments(assignmentUser.id, { projectIds: assignedProjectIds });
      setAssignmentUser(null);
      setNotice({ type: 'success', message: `Assignment project ${assignmentUser.username || assignmentUser.email} diperbarui.` });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
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
    if (user.id === sessionUserId || user.id === me?.id) {
      setNotice({ type: 'error', message: 'Akun yang sedang digunakan tidak dapat dihapus dari Settings.' });
      return;
    }
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
    if (!isKatalokaAdmin) return;
    const slug = newRole.slug.trim().toLowerCase();
    if (!ROLE_SLUG.test(slug)) {
      setNotice({ type: 'error', message: 'Slug role harus 2-50 karakter: huruf kecil, angka, atau tanda hubung.' });
      return;
    }
    setSaving(true);
    try {
      await RolesService.create({ slug, name: newRole.name.trim(), description: newRole.description.trim() });
      setNewRole({ slug: '', name: '', description: '' });
      setNotice({ type: 'success', message: 'Role dibuat.' });
      await load();
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const deleteRole = async (role: RoleRecord) => {
    if (!isKatalokaAdmin) return;
    if (!window.confirm(`Hapus role ${role.slug}?`)) return;
    setSaving(true);
    try {
      const response = await RolesService.remove(role.slug);
      await load(true);
      setNotice({ type: 'success', message: response.code === 'ROLES_ARCHIVE_SUCCESS' ? 'Role diarsipkan karena masih memiliki referensi pengguna nonaktif.' : 'Role dihapus.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const editRole = async (role: RoleRecord) => {
    if (!isKatalokaAdmin) return;
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

  const refreshSections = async () => {
    const response = await SectionsService.list({ force: true });
    setSections(response.data);
    window.dispatchEvent(new Event('sections-catalog-updated'));
  };

  const createSection = async (event: FormEvent) => {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    setSaving(true);
    try {
      await SectionsService.create({ name: newSectionName.trim() });
      setNewSectionName('');
      await refreshSections();
      setNotice({ type: 'success', message: 'Section ditambahkan.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const editSection = async (section: SectionRecord) => {
    const name = window.prompt('Nama Section', section.name);
    if (name === null || !name.trim() || name.trim() === section.name) return;
    setSaving(true);
    try {
      await SectionsService.update(section.id, { name: name.trim() });
      await refreshSections();
      setNotice({ type: 'success', message: 'Section diperbarui.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const deleteSection = async (section: SectionRecord) => {
    if (!window.confirm(`Hapus Section ${section.name}?`)) return;
    setSaving(true);
    try {
      await SectionsService.remove(section.id);
      await refreshSections();
      setNotice({ type: 'success', message: 'Section dihapus.' });
    } catch (error) { setNotice({ type: 'error', message: errorMessage(error) }); }
    finally { setSaving(false); }
  };

  const assignableRoles = roles.filter((role) => role.isActive !== false && role.slug.toLowerCase() !== 'kataloka_admin');
  const createUserRoles = isKatalokaAdmin
    ? assignableRoles
    : assignableRoles.filter((role) => role.slug.toLowerCase() === 'qa');
  const activeTypes = enterpriseTypes.filter((item) => item.isActive);
  const activeCategories = categories.filter((item) => item.isActive);
  const detailTypes = enterpriseTypes.filter((item) => item.isActive || item.id === details?.businessType);
  const detailCategories = categories.filter((item) => item.isActive || item.id === details?.category);

  return <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in duration-300">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Settings</h1><p className="mt-1 text-sm text-slate-500">Kelola profil dan akses workspace.</p></div>
      <Button variant="secondary" onClick={() => void load(true)} disabled={loading || saving} icon={<RefreshCw size={16} />}>Muat ulang</Button>
    </div>
    {notice && <div role="alert" className={`flex gap-2 rounded-lg border p-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><AlertCircle size={18} />{notice.message}</div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Memuat pengaturan…</div> : <>
      {details && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Business details</h2><form onSubmit={saveDetails} className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Business name" disabled={!isCompanyAdmin || saving} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}/><Field label="Address" disabled={!isCompanyAdmin || saving} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })}/><Field label="Phone" disabled={!isCompanyAdmin || saving} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })}/><Field label="Email" type="email" disabled={!isCompanyAdmin || saving} value={details.email ?? ''} onChange={(e) => setDetails({ ...details, email: e.target.value || null })}/><Field label="Field" disabled={!isCompanyAdmin || saving} value={details.field} onChange={(e) => setDetails({ ...details, field: e.target.value })}/><Field label="Postal code" disabled={!isCompanyAdmin || saving} value={details.postalCode} onChange={(e) => setDetails({ ...details, postalCode: e.target.value })}/><label className="block text-sm font-medium text-slate-700">Business type<select disabled={!isCompanyAdmin || saving} value={details.businessType} onChange={(e) => setDetails({ ...details, businessType: Number(e.target.value) })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{detailTypes.map((type) => <option key={type.id} value={type.id} disabled={!type.isActive}>{type.businessType}{type.isActive ? '' : ' (Nonaktif)'}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Category<select disabled={!isCompanyAdmin || saving} value={details.category} onChange={(e) => setDetails({ ...details, category: Number(e.target.value) })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{detailCategories.map((category) => <option key={category.id} value={category.id} disabled={!category.isActive}>{category.name}{category.isActive ? '' : ' (Nonaktif)'}</option>)}</select></label>{isCompanyAdmin && <div className="sm:col-span-2"><Button type="submit" disabled={saving}>Simpan business details</Button></div>}</form></section>}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Users size={20} /></div><div><h2 className="font-semibold text-slate-900">Company Profile</h2><p className="text-sm text-slate-500">Identitas perusahaan untuk workspace ini.</p></div></div>
        {!company ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Company Profile tidak tersedia untuk akun ini. Hubungi administrator.</p> : <form onSubmit={saveCompanyProfile} className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-4"><div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 p-2"><CompanyLogo company={{ id: company.id, name: companyProfile.name || company.name, hasLogo: company.hasLogo, logoVersion: company.logoVersion }} previewUrl={logoPreviewUrl} className="h-full w-full" /></div><div className="text-xs text-slate-500"><p>Preview logo perusahaan. Jika gagal dimuat, initial perusahaan ditampilkan.</p>{logoFile && <p>{logoFile.name} · {(logoFile.size / 1024).toFixed(1)} KB</p>}</div></div>
          <Field label="Company name" required disabled={!canEditCompanyProfile || saving} value={companyProfile.name} onChange={(event) => setCompanyProfile({ ...companyProfile, name: event.target.value })} />
          <div><span className="block text-sm font-medium text-slate-700">Company logo</span><input aria-label="Company logo file" type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEditCompanyProfile || saving} onChange={(event) => selectLogo(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-sm disabled:cursor-not-allowed disabled:opacity-50" />{canEditCompanyProfile && <div className="mt-2 flex gap-2"><Button type="button" size="sm" disabled={saving || !logoFile} onClick={() => void uploadLogo()}>Upload logo</Button><Button type="button" size="sm" variant="danger" disabled={saving || !company.hasLogo} onClick={() => void removeLogo()}>Hapus logo</Button></div>}</div>
          <div><span className="block text-sm font-medium text-slate-700">Company profile colour</span><div className="mt-1.5 flex min-w-0 items-center gap-2"><input aria-label="Company profile colour picker" type="color" disabled={!canEditCompanyProfile || saving} value={HEX_COLOUR.test(companyProfile.profileColour) ? companyProfile.profileColour : DEFAULT_COMPANY_BRAND} onChange={(event) => setCompanyProfile({ ...companyProfile, profileColour: event.target.value })} className="h-10 w-10 flex-none rounded-lg border border-slate-300 bg-white p-1 disabled:bg-slate-100" /><label className="min-w-0 flex-1"><span className="sr-only">Nilai warna</span><input aria-label="Nilai warna" required pattern="#[0-9a-fA-F]{6}" title="Gunakan format #RRGGBB" disabled={!canEditCompanyProfile || saving} value={companyProfile.profileColour} onChange={(event) => setCompanyProfile({ ...companyProfile, profileColour: event.target.value })} className="block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100" /></label></div></div>
          {canEditCompanyProfile ? <div className="sm:col-span-2"><Button type="submit" disabled={saving} icon={<Save size={16} />}>Simpan Company Profile</Button></div> : <p className="sm:col-span-2 text-sm text-slate-500">Company Profile bersifat view-only untuk role Anda.</p>}
        </form>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><UserCog size={20} /></div><div><h2 className="font-semibold text-slate-900">Profil saya</h2><p className="text-sm text-slate-500">Perbarui email, username, atau kata sandi Anda.</p></div></div>
        <form onSubmit={saveProfile} className="grid max-w-2xl gap-4 sm:grid-cols-2"><Field label="Email" type="email" required autoComplete="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} /><div className="sm:col-span-2"><Field label="Kata sandi baru (opsional)" type="password" minLength={8} autoComplete="new-password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} /></div><div className="sm:col-span-2"><Button type="submit" disabled={saving} icon={<Save size={16} />}>Simpan profil</Button></div></form>
      </section>
      {isKatalokaAdmin && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5"><h2 className="font-semibold text-slate-900">Company Management</h2><p className="text-sm text-slate-500">Buat company baru dan arsipkan company yang tidak aktif. Profil existing tidak dapat diedit di area ini.</p></div><form onSubmit={createCompany} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"><Field label="Company name" required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}/><Field label="Address" required value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}/><Field label="Phone" required value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}/><Field label="Email (opsional)" type="email" value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}/><Field label="Business field" required value={newCompany.field} onChange={(e) => setNewCompany({ ...newCompany, field: e.target.value })}/><Field label="Postal code" required value={newCompany.postalCode} onChange={(e) => setNewCompany({ ...newCompany, postalCode: e.target.value })}/><label className="block text-sm font-medium text-slate-700">Business type<select aria-label="Business type" required value={newCompany.businessType} onChange={(e) => setNewCompany({ ...newCompany, businessType: e.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Pilih tipe</option>{activeTypes.map((type) => <option key={type.id} value={type.id}>{type.businessType}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Category<select aria-label="Category" required value={newCompany.category} onChange={(e) => setNewCompany({ ...newCompany, category: e.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Pilih kategori</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="md:col-span-2"><Button type="submit" disabled={saving} icon={<Plus size={16}/>}>Buat company</Button></div></form><ul className="divide-y rounded-lg border border-slate-200">{managedCompanies.map((managedCompany) => <li key={managedCompany.id} className="flex items-center justify-between gap-3 p-3"><div><p className="font-medium text-slate-800">{managedCompany.name}</p><p className="text-xs text-slate-500">{managedCompany.isActive ? 'Aktif' : 'Diarsipkan'}</p></div><Button variant={managedCompany.isActive ? 'danger' : 'secondary'} size="sm" disabled={saving} onClick={() => void updateCompanyStatus(managedCompany)}>{managedCompany.isActive ? 'Arsipkan' : 'Aktifkan'}</Button></li>)}</ul></section>}
      {isKatalokaAdmin && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Company controls</h2><ul className="mt-4 divide-y rounded-lg border border-slate-200">{managedCompanies.map((managedCompany) => <li key={`${managedCompany.id}-controls`} className="flex items-center justify-between gap-3 p-3"><span className="text-sm font-medium text-slate-800">{managedCompany.name}</span><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => void viewCompany(managedCompany.id)}>Lihat</Button><Button variant="danger" size="sm" disabled={saving || managedCompany.isActive} onClick={() => void deleteCompany(managedCompany)}>Hapus</Button></div></li>)}</ul>{companyDetail && <div role="status" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>{companyDetail.name}</strong><span className="ml-2">{companyDetail.isActive ? 'Aktif' : 'Diarsipkan'}</span></div>}</section>}
      {isKatalokaAdmin && companyDetail && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Selected company details</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Name</dt><dd>{companyDetail.name}</dd></div><div><dt className="text-slate-500">Address</dt><dd>{companyDetail.address}</dd></div><div><dt className="text-slate-500">Phone</dt><dd>{companyDetail.phone}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{companyDetail.email ?? '—'}</dd></div><div><dt className="text-slate-500">Field</dt><dd>{companyDetail.field}</dd></div><div><dt className="text-slate-500">Postal code</dt><dd>{companyDetail.postalCode}</dd></div><div><dt className="text-slate-500">Business type</dt><dd>{enterpriseTypes.find((item) => item.id === companyDetail.businessType)?.businessType ?? companyDetail.businessType}</dd></div><div><dt className="text-slate-500">Category</dt><dd>{categories.find((item) => item.id === companyDetail.category)?.name ?? companyDetail.category}</dd></div></dl></section>}
      {isKatalokaAdmin && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Business Type and Category</h2><p className="mt-1 text-sm text-slate-500">Kelola nama, deskripsi, dan status katalog. Status nonaktif tidak tersedia untuk company baru.</p><div className="mt-4 grid gap-6 lg:grid-cols-2"><div><h3 className="font-medium text-slate-800">Business type</h3><form onSubmit={(event) => void createMaster('type', event)} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3"><Field label="Type ID" required disabled={saving || editingMaster?.kind === 'type'} type="number" placeholder="Contoh: 1" value={newType.id} onChange={(e) => setNewType({ ...newType, id: e.target.value })}/><Field label="Business type name" required placeholder="Contoh: Perseroan Terbatas" value={newType.businessType} onChange={(e) => setNewType({ ...newType, businessType: e.target.value })}/><Field label="Description (optional)" placeholder="Penjelasan singkat tipe badan usaha" value={newType.description} onChange={(e) => setNewType({ ...newType, description: e.target.value })}/><label className="flex items-center gap-2 text-sm text-slate-700"><input aria-label="Legal entity" type="checkbox" checked={newType.legalEntity} onChange={(e) => setNewType({ ...newType, legalEntity: e.target.checked })}/> Legal entity</label><label className="flex items-center gap-2 text-sm text-slate-700"><input aria-label="Business type active" type="checkbox" checked={newType.isActive} onChange={(e) => setNewType({ ...newType, isActive: e.target.checked })}/> Aktif</label><div className="flex gap-2"><Button type="submit" disabled={saving}>{editingMaster?.kind === 'type' ? 'Simpan type' : 'Tambah type'}</Button>{editingMaster?.kind === 'type' && <Button type="button" variant="secondary" onClick={() => { setEditingMaster(null); setNewType({ id: '', businessType: '', description: '', legalEntity: false, isActive: true }); }}>Batal</Button>}</div></form><ul className="mt-3 divide-y rounded border">{enterpriseTypes.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 p-2 text-sm"><span>{item.businessType} · {item.isActive ? 'Aktif' : 'Nonaktif'}</span><span className="flex gap-2"><Button size="sm" variant="secondary" disabled={saving} onClick={() => editMaster('type', item)}>Ubah</Button><Button size="sm" variant="danger" disabled={saving} onClick={() => void removeMaster('type', item.id)}>Hapus</Button></span></li>)}</ul></div><div><h3 className="font-medium text-slate-800">Category</h3><form onSubmit={(event) => void createMaster('category', event)} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3"><Field label="Category ID" required disabled={saving || editingMaster?.kind === 'category'} type="number" placeholder="Contoh: 1" value={newCategory.id} onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value })}/><Field label="Category code" required placeholder="Contoh: TECHNOLOGY" value={newCategory.code} onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}/><Field label="Category name" required placeholder="Contoh: Technology" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}/><Field label="Description (optional)" placeholder="Penjelasan singkat kategori" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}/><label className="flex items-center gap-2 text-sm text-slate-700"><input aria-label="Category active" type="checkbox" checked={newCategory.isActive} onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}/> Aktif</label><div className="flex gap-2"><Button type="submit" disabled={saving}>{editingMaster?.kind === 'category' ? 'Simpan category' : 'Tambah category'}</Button>{editingMaster?.kind === 'category' && <Button type="button" variant="secondary" onClick={() => { setEditingMaster(null); setNewCategory({ id: '', code: '', name: '', description: '', isActive: true }); }}>Batal</Button>}</div></form><ul className="mt-3 divide-y rounded border">{categories.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 p-2 text-sm"><span>{item.name} · {item.isActive ? 'Aktif' : 'Nonaktif'}</span><span className="flex gap-2"><Button size="sm" variant="secondary" disabled={saving} onClick={() => editMaster('category', item)}>Ubah</Button><Button size="sm" variant="danger" disabled={saving} onClick={() => void removeMaster('category', item.id)}>Hapus</Button></span></li>)}</ul></div></div></section>}
      {isAdmin && <>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Users size={20} /></div><div><h2 className="font-semibold text-slate-900">Akun pengguna</h2><p className="text-sm text-slate-500">Buat dan kelola akses anggota workspace.</p></div></div>
          <form onSubmit={(event) => { event.preventDefault(); setAppliedUserFilters(isKatalokaAdmin ? userFilters : { q: userFilters.q, companyId: '' }); }} className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 p-3"><Field label="Cari email atau username" value={userFilters.q} onChange={(event) => setUserFilters({ ...userFilters, q: event.target.value })} />{isKatalokaAdmin && <label className="block text-sm font-medium text-slate-700">Filter company<select aria-label="Filter company" value={userFilters.companyId} onChange={(event) => setUserFilters({ ...userFilters, companyId: event.target.value })} className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Semua company</option>{managedCompanies.map((managedCompany) => <option key={managedCompany.id} value={managedCompany.id}>{managedCompany.name}</option>)}</select></label>}<div className="flex items-end"><Button type="submit" variant="secondary">Filter</Button></div></form>
          <form onSubmit={createUser} className="mb-6 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 md:items-end"><Field label="Email" type="email" required autoComplete="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} /><Field label="Kata sandi" type="password" required minLength={8} autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /><div><div className="flex items-center gap-1"><label htmlFor="new-user-role" className="text-sm font-medium text-slate-700">Role</label>{!isKatalokaAdmin && <span className="group relative inline-flex cursor-help text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20" tabIndex={0} aria-label="Bantuan batasan role akun" aria-describedby="new-user-role-help">(i)<span id="new-user-role-help" role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">Admin company hanya dapat membuat akun QA untuk company sendiri.</span></span>}</div><select id="new-user-role" className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={newUser.roleSlug} onChange={(e) => setNewUser({ ...newUser, roleSlug: e.target.value })}>{createUserRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name ?? role.slug}</option>)}</select></div>{isKatalokaAdmin && <label className="block text-sm font-medium text-slate-700">Company<select aria-label="Company untuk akun baru" required value={newUser.companyId} onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Pilih company</option>{managedCompanies.filter((managedCompany) => managedCompany.isActive).map((managedCompany) => <option key={managedCompany.id} value={managedCompany.id}>{managedCompany.name}</option>)}</select></label>}<div className="flex md:self-end"><Button type="submit" disabled={saving} icon={<Plus size={16} />}>{saving ? 'Menambahkan…' : 'Tambah'}</Button></div></form>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Pengguna</th>{isKatalokaAdmin && <th className="p-3">Company</th>}<th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody>{users.map((user) => <Fragment key={user.id}>
            <tr key={user.id} className="border-b"><td className="p-3"><div className="font-medium text-slate-800">{user.username}</div><div className="text-slate-500">{user.email}</div></td>{isKatalokaAdmin && <td className="p-3 text-slate-600">{user.company?.name ?? '—'}</td>}<td className="p-3">{user.roleSlug}</td><td className="p-3">{user.isActive ? 'Aktif' : 'Nonaktif'}</td><td className="p-3 text-right"><div className="flex justify-end gap-2">{isKatalokaAdmin && user.roleSlug.toLowerCase() !== 'admin' && <Button variant="secondary" size="sm" disabled={saving} onClick={() => void openAssignments(user)}>Project</Button>}<Button variant="secondary" size="sm" disabled={saving} onClick={() => beginUserEdit(user)} icon={<Pencil size={15} />}>Ubah</Button>{user.id === sessionUserId || user.id === me?.id ? <span className="group relative inline-flex" tabIndex={0} aria-describedby={`self-delete-help-${user.id}`}><Button variant="danger" size="sm" disabled icon={<Trash2 size={15} />}>Hapus</Button><span id={`self-delete-help-${user.id}`} role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">Akun Anda tidak dapat dihapus.</span></span> : <Button variant="danger" size="sm" disabled={saving} onClick={() => void deleteUser(user)} icon={<Trash2 size={15} />}>Hapus</Button>}</div></td></tr>
            {editingUser?.id === user.id && <tr key={`${user.id}-editor`} className="border-b bg-slate-50"><td colSpan={isKatalokaAdmin ? 5 : 4} className="p-4"><form onSubmit={saveUserEdit} className="grid gap-3 md:grid-cols-2"><Field label="Email" type="email" required autoComplete="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} /><Field label="Username" required autoComplete="username" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} /><Field label="Kata sandi baru (opsional)" type="password" minLength={8} autoComplete="new-password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /><label className="block text-sm font-medium text-slate-700">Role<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={editingUser.roleSlug} onChange={(e) => setEditingUser({ ...editingUser, roleSlug: e.target.value })}>{assignableRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name ?? role.slug}</option>)}</select></label><label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={editingUser.isActive} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })} />Akun aktif</label><div className="flex items-end justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => setEditingUser(null)}>Batal</Button><Button type="submit" disabled={saving} icon={<Save size={16} />}>Simpan akun</Button></div></form></td></tr>}
          </Fragment>)}</tbody></table></div>
        </section>
        {isKatalokaAdmin && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Shield size={20} /></div><div><h2 className="font-semibold text-slate-900">Role</h2><p className="text-sm text-slate-500">Tambahkan role untuk penugasan akun mendatang.</p></div></div><form noValidate onSubmit={createRole} className="mb-8 grid gap-3 md:grid-cols-4 md:items-end"><div><div className="flex items-center gap-1"><label htmlFor="role-slug" className="text-sm font-medium text-slate-700">Slug</label><span className="group relative inline-flex cursor-help text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20" tabIndex={0} aria-label="Bantuan format slug role" aria-describedby="role-slug-help">(i)<span id="role-slug-help" role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">2-50 karakter: huruf kecil, angka, atau tanda hubung.</span></span></div><input id="role-slug" required minLength={2} maxLength={50} pattern="[a-z0-9-]{2,50}" title="2-50 huruf kecil, angka, atau tanda hubung" value={newRole.slug} onChange={(e) => setNewRole({ ...newRole, slug: e.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100" /></div><Field label="Nama" required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} /><Field label="Deskripsi" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} /><div className="flex md:self-end"><Button type="submit" disabled={saving} icon={<Plus size={16} />}>Tambah role</Button></div></form><ul className="divide-y rounded-lg border border-slate-200">{roles.map((role) => <li key={role.slug} className="flex items-center justify-between gap-4 p-3"><div><span className="font-medium text-slate-800">{role.name ?? role.slug}</span><span className="ml-2 text-xs text-slate-500">{role.slug}</span>{role.isActive === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Nonaktif</span>}{role.description && <p className="text-sm text-slate-500">{role.description}</p>}</div><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => void editRole(role)}>Ubah</Button>{role.slug === 'kataloka_admin' ? <span className="group relative inline-flex" tabIndex={0} aria-describedby={`role-delete-help-${role.slug}`}><Button variant="danger" size="sm" disabled icon={<Trash2 size={15} />}>Hapus</Button><span id={`role-delete-help-${role.slug}`} role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100">Role platform Kataloka Admin tidak dapat dihapus.</span></span> : <Button variant="danger" size="sm" disabled={saving} onClick={() => void deleteRole(role)} icon={<Trash2 size={15} />}>Hapus</Button>}</div></li>)}</ul></section>}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Shield size={20} /></div><div><h2 className="font-semibold text-slate-900">Katalog Section Test Case</h2><p className="text-sm text-slate-500">Hanya Admin dapat menambah, mengubah, atau menghapus pilihan Section.</p></div></div><form onSubmit={createSection} className="mb-4 flex max-w-xl gap-3"><input required maxLength={150} value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} placeholder="Nama Section" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /><Button type="submit" disabled={saving} icon={<Plus size={16} />}>Tambah Section</Button></form><ul className="divide-y rounded-lg border border-slate-200">{sections.length === 0 ? <li className="p-3 text-sm text-slate-500">Belum ada Section.</li> : sections.map((section) => <li key={section.id} className="flex items-center justify-between gap-4 p-3"><span className="text-sm font-medium text-slate-800">{section.name}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => void editSection(section)}>Ubah</Button><Button variant="danger" size="sm" disabled={saving} onClick={() => void deleteSection(section)} icon={<Trash2 size={15} />}>Hapus</Button></div></li>)}</ul></section>
      </>}
    </>}
    {assignmentUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-title">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="assignment-title" className="font-semibold text-slate-900">Assignment project</h2><p className="mt-1 text-sm text-slate-500">Pilih project yang dapat diakses oleh {assignmentUser.username || assignmentUser.email}.</p></div><button aria-label="Tutup dialog" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setAssignmentUser(null)} disabled={saving}><X size={20}/></button></div><div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">{assignmentLoading ? <p className="text-sm text-slate-500">Memuat assignment…</p> : projects.length === 0 ? <p className="text-sm text-slate-500">Belum ada project untuk di-assign.</p> : projects.map((project) => <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"><input type="checkbox" checked={assignedProjectIds.includes(project.id)} onChange={(event) => setAssignedProjectIds((current) => event.target.checked ? [...current, project.id] : current.filter((id) => id !== project.id))}/><span><span className="block text-sm font-medium text-slate-800">{project.name}</span>{project.key && <span className="text-xs text-slate-500">{project.key}</span>}</span></label>)}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><Button variant="secondary" onClick={() => setAssignmentUser(null)} disabled={saving}>Batal</Button><Button onClick={() => void saveAssignments()} disabled={saving || assignmentLoading} icon={<Save size={16}/>}>Simpan assignment</Button></div></div>
    </div>}
  </div>;
};
