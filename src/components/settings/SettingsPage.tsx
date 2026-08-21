import {
  Fragment,
  FormEvent,
  type InputHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Archive,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { RolesService, UsersService, type UserPayload } from '@/src/api/users.service.ts';
import { CompaniesService } from '@/src/api/companies.service.ts';
import { ProjectsService, SectionsService } from '@/src/api/projects.service.ts';
import type {
  CompanyDetailsRecord,
  CompanyRecord,
  EnterpriseCategoryRecord,
  EnterpriseTypeRecord,
  ManagedCompanyRecord,
  ProjectAssignmentRecord,
  RoleRecord,
  SectionRecord,
  UserRecord,
} from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { PromptModal } from '@/src/components/projectsTestCases/ui/PromptModal.tsx';
import { RowActions } from '@/src/components/projectsTestCases/ui/RowActions.tsx';
import { CompanyLogo } from '@/src/components/company/CompanyLogo.tsx';
import { DEFAULT_COMPANY_BRAND } from '@/src/components/company/company-brand.ts';
import { sectionCatalogStore, useSectionCatalog } from '@/src/state/section-catalog.ts';

type Notice = { type: 'success' | 'error'; message: string } | null;
type UserEditor = Pick<UserRecord, 'id' | 'email' | 'username' | 'roleSlug' | 'isActive'> & {
  password: string;
};
const errorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error
    ? String(error.message)
    : 'Request gagal. Coba lagi.';
const createUserErrorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error && String(error.message).trim()
    ? String(error.message)
    : 'Gagal menambahkan akun pengguna.';
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ROLE_SLUG = /^[a-z0-9-]{2,50}$/;

const Field = ({
  label,
  showRequiredIndicator = false,
  ...props
}: { label: string; showRequiredIndicator?: boolean } & InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    {showRequiredIndicator && (
      <>
        <span aria-hidden="true" data-required-marker className="ml-1 text-red-600">
          *
        </span>
        <span className="sr-only"> (wajib)</span>
      </>
    )}
    <input
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100"
    />
  </label>
);

const PasswordField = ({
  visible,
  onVisibilityChange,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  visible: boolean;
  onVisibilityChange: () => void;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    Kata sandi baru (opsional)
    <span className="relative mt-1.5 block">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      <button
        type="button"
        aria-label={visible ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
        aria-pressed={visible}
        onClick={onVisibilityChange}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
      >
        <span className="sr-only">{visible ? 'Sembunyikan' : 'Tampilkan'} kata sandi</span>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  </label>
);

export const SettingsPage = () => {
  const sessionUser = useSessionUser();
  const sessionUserId = sessionUser?.id;
  // The session is used until the profile request completes. Thereafter, use
  // the freshly revalidated role so permission controls follow a role change
  // made while this page is open.
  const [me, setMe] = useState<UserRecord | null>(null);
  const roleSlug = (me?.roleSlug ?? sessionUser?.roleSlug)?.toLowerCase();
  const isKatalokaAdmin = roleSlug === 'kataloka_admin';
  const isCompanyAdmin = roleSlug === 'admin';
  const isAdmin = isKatalokaAdmin || isCompanyAdmin;
  const canEditCompanyProfile = isCompanyAdmin && !isKatalokaAdmin;
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [projects, setProjects] = useState<ProjectAssignmentRecord[]>([]);
  const [selectedSectionProjectId, setSelectedSectionProjectId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const sectionCatalog = useSectionCatalog(selectedSectionProjectId);
  const sections = sectionCatalog.sections;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [profile, setProfile] = useState({ email: '', username: '', password: '' });
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [company, setCompany] = useState<CompanyRecord | null>(sessionUser?.company ?? null);
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    profileColour: DEFAULT_COMPANY_BRAND,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [managedCompanies, setManagedCompanies] = useState<ManagedCompanyRecord[]>([]);
  const [categories, setCategories] = useState<EnterpriseCategoryRecord[]>([]);
  const [enterpriseTypes, setEnterpriseTypes] = useState<EnterpriseTypeRecord[]>([]);
  const [newCompany, setNewCompany] = useState({
    name: '',
    businessType: '',
    category: '',
    address: '',
    phone: '',
    email: '',
    field: '',
    postalCode: '',
  });
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    password: '',
    roleSlug: 'qa',
    companyId: '',
  });
  const [userFilters, setUserFilters] = useState({ q: '', companyId: '' });
  const [appliedUserFilters, setAppliedUserFilters] = useState({ q: '', companyId: '' });
  const [companyDetail, setCompanyDetail] = useState<ManagedCompanyRecord | null>(null);
  const [details, setDetails] = useState<CompanyDetailsRecord | null>(null);
  const [newType, setNewType] = useState({
    id: '',
    businessType: '',
    description: '',
    legalEntity: false,
    isActive: true,
  });
  const [newCategory, setNewCategory] = useState({
    id: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  });
  const [editingMaster, setEditingMaster] = useState<{
    kind: 'type' | 'category';
    id: number;
  } | null>(null);
  const [newRole, setNewRole] = useState({ slug: '', name: '', description: '' });
  const [editingUser, setEditingUser] = useState<UserEditor | null>(null);
  const [assignmentUser, setAssignmentUser] = useState<UserRecord | null>(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [settingsPrompt, setSettingsPrompt] = useState<{
    title: string;
    label: string;
    initialValue: string;
    onSubmit: (value: string) => void;
  } | null>(null); // eslint-disable-line no-unused-vars
  const loadGeneration = useRef(0);
  const creatingUser = useRef(false);

  const askConfirmation = (title: string, message: string, onConfirm: () => void) =>
    setConfirmation({ title, message, onConfirm });

  const load = useCallback(
    async (force = false) => {
      const generation = ++loadGeneration.current;
      const isCurrentLoad = () => loadGeneration.current === generation;
      if (!sessionUserId) return;
      setLoading(true);
      setNotice(null);
      try {
        // User data is fetched only for administrators. Client-side hiding is not
        // an authorization boundary; the API also enforces this restriction.
        const options = force ? { force: true } : undefined;
        const [meResult, companyResult] = await Promise.allSettled([
          UsersService.getMe(options),
          CompaniesService.getProfile(options),
        ]);
        if (!isCurrentLoad()) return;
        if (meResult.status === 'rejected') throw meResult.reason;
        const meResponse = meResult.value;
        setMe(meResponse.data);
        setProfile({
          email: meResponse.data.email,
          username: meResponse.data.username ?? '',
          password: '',
        });
        if (companyResult.status === 'fulfilled') {
          setCompany(companyResult.value.data);
          setCompanyProfile({
            name: companyResult.value.data.name,
            profileColour: companyResult.value.data.profileColour ?? DEFAULT_COMPANY_BRAND,
          });
        } else {
          setCompany(null);
          setNotice({
            type: 'error',
            message: `Company Profile tidak tersedia: ${errorMessage(companyResult.reason)}`,
          });
        }
        if (!isKatalokaAdmin) {
          const [detailsResponse, categoriesResponse, typesResponse] = await Promise.all([
            CompaniesService.getDetails(),
            CompaniesService.listCategories(false),
            CompaniesService.listTypes(false),
          ]);
          if (!isCurrentLoad()) return;
          setDetails(detailsResponse.data);
          setCategories(categoriesResponse.data);
          setEnterpriseTypes(typesResponse.data);
        } else setDetails(null);
        // Project membership is the authorization boundary for the Section
        // catalog. Fetch the caller's scoped projects for every Settings user,
        // while keeping unrelated account administration admin-only.
        const projectsPromise = ProjectsService.list(options);
        if (isAdmin) {
          const roleRequest = isKatalokaAdmin
            ? RolesService.list(options)
            : RolesService.assignable(options);
          const [rolesResponse, usersResponse, projectsResponse] = await Promise.all([
            roleRequest.catch(() => null),
            // The server scopes this sensitive list from the current session.
            // Do not reuse a list cached under an earlier permission context.
            UsersService.list(
              { force: true },
              {
                q: appliedUserFilters.q,
                ...(isKatalokaAdmin ? { companyId: appliedUserFilters.companyId } : {}),
              },
            ),
            projectsPromise,
          ]);
          if (!isCurrentLoad()) return;
          setRoles(rolesResponse?.data ?? []);
          setUsers(usersResponse.data);
          setProjects(projectsResponse.data);
          setSelectedSectionProjectId((current) =>
            projectsResponse.data.some((project) => project.id === current)
              ? current
              : (projectsResponse.data[0]?.id ?? ''),
          );
          if (isKatalokaAdmin) {
            const [companiesResponse, categoriesResponse, typesResponse] = await Promise.all([
              CompaniesService.listManaged(options),
              CompaniesService.listCategories(false),
              CompaniesService.listTypes(false),
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
          const projectsResponse = await projectsPromise;
          if (!isCurrentLoad()) return;
          setProjects(projectsResponse.data);
          setSelectedSectionProjectId((current) =>
            projectsResponse.data.some((project) => project.id === current)
              ? current
              : (projectsResponse.data[0]?.id ?? ''),
          );
        }
      } catch (error) {
        if (isCurrentLoad()) setNotice({ type: 'error', message: errorMessage(error) });
      } finally {
        if (isCurrentLoad()) setLoading(false);
      }
    },
    [appliedUserFilters, isAdmin, isKatalokaAdmin, sessionUserId],
  );

  useEffect(() => {
    void load();
    return () => {
      // Prevent a completed request from an unmounted/previous session view
      // from committing its response after React remounts Settings.
      loadGeneration.current += 1;
    };
  }, [load]);

  useEffect(
    () => () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    },
    [logoPreviewUrl],
  );

  useEffect(() => {
    if (!isCompanyAdmin) setAssignmentUser(null);
  }, [isCompanyAdmin]);

  useEffect(() => {
    const availableRoles = roles.filter(
      (role) =>
        role.isActive !== false &&
        role.slug.toLowerCase() !== 'kataloka_admin' &&
        (isKatalokaAdmin || role.slug.toLowerCase() === 'qa'),
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
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
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
      const response = await CompaniesService.updateProfile({
        name,
        profileColour: companyProfile.profileColour,
      });
      setCompany(response.data);
      setCompanyProfile({
        name: response.data.name,
        profileColour: response.data.profileColour ?? DEFAULT_COMPANY_BRAND,
      });
      window.dispatchEvent(
        new CustomEvent<CompanyRecord>('company-profile-updated', { detail: response.data }),
      );
      setNotice({ type: 'success', message: 'Company Profile berhasil diperbarui.' });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const selectLogo = (file: File | null) => {
    if (!file) return;
    if (!LOGO_TYPES.has(file.type) || file.size > MAX_LOGO_BYTES) {
      setNotice({
        type: 'error',
        message: 'Logo harus PNG, JPEG, atau WebP dengan ukuran maksimal 2 MB.',
      });
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
      window.dispatchEvent(
        new CustomEvent<CompanyRecord>('company-profile-updated', { detail: updatedCompany }),
      );
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      setLogoFile(null);
      setNotice({ type: 'success', message: 'Logo perusahaan berhasil diperbarui.' });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    if (!canEditCompanyProfile || !company || !company.hasLogo) return;
    setSaving(true);
    try {
      const response = await CompaniesService.removeLogo();
      const updatedCompany = { ...company, ...response.data };
      setCompany(updatedCompany);
      window.dispatchEvent(
        new CustomEvent<CompanyRecord>('company-profile-updated', { detail: updatedCompany }),
      );
      setNotice({ type: 'success', message: 'Logo perusahaan dihapus.' });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
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
      setNotice({
        type: 'error',
        message: isKatalokaAdmin
          ? 'Pilih role aktif selain Kataloka Admin.'
          : 'Admin company hanya dapat membuat akun dengan role QA.',
      });
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
      await UsersService.create({
        ...payload,
        email,
        username,
        isActive: true,
        ...(isKatalokaAdmin ? { companyId } : {}),
      });
      setNewUser({ email: '', username: '', password: '', roleSlug: 'qa', companyId: '' });
      await load(true);
      setNotice({ type: 'success', message: 'Akun pengguna berhasil ditambahkan.' });
    } catch (error) {
      setNotice({ type: 'error', message: createUserErrorMessage(error) });
    } finally {
      creatingUser.current = false;
      setSaving(false);
    }
  };

  const createCompany = async (event: FormEvent) => {
    event.preventDefault();
    if (!isKatalokaAdmin) return;
    if (
      !newCompany.name.trim() ||
      !newCompany.businessType ||
      !newCompany.category ||
      !newCompany.address.trim() ||
      !newCompany.phone.trim() ||
      !newCompany.field.trim() ||
      !newCompany.postalCode.trim()
    ) {
      setNotice({ type: 'error', message: 'Lengkapi seluruh field company yang wajib.' });
      return;
    }
    setSaving(true);
    try {
      await CompaniesService.createManaged({
        name: newCompany.name.trim(),
        businessType: Number(newCompany.businessType),
        category: Number(newCompany.category),
        address: newCompany.address.trim(),
        phone: newCompany.phone.trim(),
        email: newCompany.email.trim() || null,
        field: newCompany.field.trim(),
        postalCode: newCompany.postalCode.trim(),
      });
      setNewCompany({
        name: '',
        businessType: '',
        category: '',
        address: '',
        phone: '',
        email: '',
        field: '',
        postalCode: '',
      });
      setNotice({ type: 'success', message: 'Company berhasil dibuat.' });
      await load(true);
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const updateCompanyStatus = async (managedCompany: ManagedCompanyRecord) => {
    if (!isKatalokaAdmin) return;
    setSaving(true);
    try {
      await CompaniesService.updateManagedStatus(managedCompany.id, !managedCompany.isActive);
      setNotice({
        type: 'success',
        message: `Company ${managedCompany.isActive ? 'diarsipkan' : 'diaktifkan'}.`,
      });
      await load(true);
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const viewCompany = async (id: string) => {
    if (!isKatalokaAdmin) return;
    try {
      setCompanyDetail((await CompaniesService.getManaged(id)).data);
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    }
  };

  const deleteCompany = async (managedCompany: ManagedCompanyRecord) => {
    if (!isKatalokaAdmin || managedCompany.isActive) return;
    askConfirmation('Hapus company', `Hapus company ${managedCompany.name}?`, () => {
      setConfirmation(null);
      setSaving(true);
      void CompaniesService.deleteManaged(managedCompany.id)
        .then(() => {
          setCompanyDetail((current) => (current?.id === managedCompany.id ? null : current));
          setNotice({ type: 'success', message: 'Company berhasil dihapus.' });
          return load(true);
        })
        .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
        .finally(() => setSaving(false));
    });
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    if (!isCompanyAdmin || !details) return;
    setSaving(true);
    try {
      const response = await CompaniesService.updateDetails({
        name: details.name,
        businessType: details.businessType,
        category: details.category,
        address: details.address,
        phone: details.phone,
        email: details.email,
        field: details.field,
        postalCode: details.postalCode,
        profileColour: details.profileColour,
      });
      setDetails(response.data);
      setNotice({ type: 'success', message: 'Detail company berhasil diperbarui.' });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const createMaster = async (kind: 'type' | 'category', event: FormEvent) => {
    event.preventDefault();
    if (!isKatalokaAdmin) return;
    setSaving(true);
    try {
      if (kind === 'type') {
        const payload = {
          businessType: newType.businessType.trim(),
          description: newType.description.trim() || null,
          legalEntity: newType.legalEntity,
          isActive: newType.isActive,
        };
        if (editingMaster?.kind === 'type')
          await CompaniesService.updateType(editingMaster.id, payload);
        else await CompaniesService.createType({ id: Number(newType.id), ...payload });
        setNewType({
          id: '',
          businessType: '',
          description: '',
          legalEntity: false,
          isActive: true,
        });
      } else {
        const payload = {
          code: newCategory.code.trim(),
          name: newCategory.name.trim(),
          description: newCategory.description.trim(),
          isActive: newCategory.isActive,
        };
        if (editingMaster?.kind === 'category')
          await CompaniesService.updateCategory(editingMaster.id, payload);
        else await CompaniesService.createCategory({ id: Number(newCategory.id), ...payload });
        setNewCategory({ id: '', code: '', name: '', description: '', isActive: true });
      }
      setEditingMaster(null);
      await load(true);
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };
  const removeMaster = async (kind: 'type' | 'category', id: number) => {
    if (!isKatalokaAdmin) return;
    askConfirmation('Hapus master', 'Hapus master ini?', () => {
      setConfirmation(null);
      setSaving(true);
      void (kind === 'type' ? CompaniesService.deleteType(id) : CompaniesService.deleteCategory(id))
        .then(() => load(true))
        .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
        .finally(() => setSaving(false));
    });
  };
  const editMaster = (
    kind: 'type' | 'category',
    item: EnterpriseTypeRecord | EnterpriseCategoryRecord,
  ) => {
    if (!isKatalokaAdmin) return;
    if (kind === 'type') {
      const type = item as EnterpriseTypeRecord;
      setNewType({
        id: String(type.id),
        businessType: type.businessType,
        description: type.description ?? '',
        legalEntity: Boolean(type.legalEntity),
        isActive: type.isActive,
      });
    } else {
      const category = item as EnterpriseCategoryRecord;
      setNewCategory({
        id: String(category.id),
        code: category.code,
        name: category.name,
        description: category.description ?? '',
        isActive: category.isActive,
      });
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
    if (!isCompanyAdmin) return;
    setAssignmentUser(user);
    setAssignedProjectIds([]);
    setAssignmentLoading(true);
    setNotice(null);
    try {
      const response = await UsersService.getProjectAssignments(user.id);
      setAssignedProjectIds(response.data.projectIds);
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setAssignmentLoading(false);
    }
  };

  const saveAssignments = async () => {
    if (!isCompanyAdmin || !assignmentUser) return;
    setSaving(true);
    try {
      await UsersService.updateProjectAssignments(assignmentUser.id, {
        projectIds: assignedProjectIds,
      });
      setAssignmentUser(null);
      setNotice({
        type: 'success',
        message: `Assignment project ${assignmentUser.username || assignmentUser.email} diperbarui.`,
      });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
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
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: UserRecord) => {
    if (user.id === sessionUserId || user.id === me?.id) {
      setNotice({
        type: 'error',
        message: 'Akun yang sedang digunakan tidak dapat dihapus dari Settings.',
      });
      return;
    }
    askConfirmation(
      'Hapus akun',
      `Hapus akun ${user.email}? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        setConfirmation(null);
        setSaving(true);
        void UsersService.remove(user.id)
          .then(() => {
            setNotice({ type: 'success', message: 'Akun dihapus.' });
            return load();
          })
          .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
          .finally(() => setSaving(false));
      },
    );
  };

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!isKatalokaAdmin) return;
    const slug = newRole.slug.trim().toLowerCase();
    if (!ROLE_SLUG.test(slug)) {
      setNotice({
        type: 'error',
        message: 'Slug role harus 2-50 karakter: huruf kecil, angka, atau tanda hubung.',
      });
      return;
    }
    setSaving(true);
    try {
      await RolesService.create({
        slug,
        name: newRole.name.trim(),
        description: newRole.description.trim(),
      });
      setNewRole({ slug: '', name: '', description: '' });
      setNotice({ type: 'success', message: 'Role dibuat.' });
      await load();
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role: RoleRecord) => {
    if (!isKatalokaAdmin) return;
    askConfirmation('Hapus role', `Hapus role ${role.slug}?`, () => {
      setConfirmation(null);
      setSaving(true);
      void RolesService.remove(role.slug)
        .then((response) =>
          load(true).then(() =>
            setNotice({
              type: 'success',
              message:
                response.code === 'ROLES_ARCHIVE_SUCCESS'
                  ? 'Role diarsipkan karena masih memiliki referensi pengguna nonaktif.'
                  : 'Role dihapus.',
            }),
          ),
        )
        .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
        .finally(() => setSaving(false));
    });
  };

  const editRole = async (role: RoleRecord) => {
    if (!isKatalokaAdmin) return;
    setSettingsPrompt({
      title: 'Ubah role',
      label: 'Nama role',
      initialValue: role.name ?? role.slug,
      onSubmit: (name) => {
        setSettingsPrompt({
          title: 'Ubah role',
          label: 'Deskripsi role',
          initialValue: role.description ?? '',
          onSubmit: (description) => {
            setSettingsPrompt(null);
            setSaving(true);
            void RolesService.update(role.slug, { name, description })
              .then(() => {
                setNotice({ type: 'success', message: 'Role diperbarui.' });
                return load();
              })
              .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
              .finally(() => setSaving(false));
          },
        });
      },
    });
  };

  const createSection = async (event: FormEvent) => {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    setSaving(true);
    try {
      if (!selectedSectionProjectId) return;
      await sectionCatalogStore.mutate(selectedSectionProjectId, () => SectionsService.create(selectedSectionProjectId, { name: newSectionName.trim() }));
      setNewSectionName('');
      setNotice({ type: 'success', message: 'Section ditambahkan.' });
    } catch (error) {
      setNotice({ type: 'error', message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const editSection = async (section: SectionRecord) => {
    setSettingsPrompt({
      title: 'Ubah Section',
      label: 'Nama Section',
      initialValue: section.name,
      onSubmit: (name) => {
        if (name === section.name || !selectedSectionProjectId) {
          setSettingsPrompt(null);
          return;
        }
        setSettingsPrompt(null);
        setSaving(true);
        void sectionCatalogStore.mutate(selectedSectionProjectId, () => SectionsService.update(selectedSectionProjectId, section.id, { name }))
          .then(() => setNotice({ type: 'success', message: 'Section diperbarui.' }))
          .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
          .finally(() => setSaving(false));
      },
    });
  };

  const deleteSection = async (section: SectionRecord) => {
    if (!selectedSectionProjectId) return;
    askConfirmation('Hapus Section', `Hapus Section ${section.name}?`, () => {
      setConfirmation(null);
      setSaving(true);
      void sectionCatalogStore.mutate(selectedSectionProjectId, () => SectionsService.remove(selectedSectionProjectId, section.id))
        .then(() => setNotice({ type: 'success', message: 'Section dihapus.' }))
        .catch((error) => setNotice({ type: 'error', message: errorMessage(error) }))
        .finally(() => setSaving(false));
    });
  };

  const assignableRoles = roles.filter(
    (role) => role.isActive !== false && role.slug.toLowerCase() !== 'kataloka_admin',
  );
  const editableRoles =
    editingUser?.roleSlug.toLowerCase() === 'kataloka_admin'
      ? [
          ...roles.filter((role) => role.slug.toLowerCase() === 'kataloka_admin'),
          ...assignableRoles,
        ]
      : assignableRoles;
  const roleLabel = (role: RoleRecord) =>
    role.slug.toLowerCase() === 'kataloka_admin'
      ? 'Kataloka Administrator'
      : (role.name ?? role.slug);
  const createUserRoles = isKatalokaAdmin
    ? assignableRoles
    : assignableRoles.filter((role) => role.slug.toLowerCase() === 'qa');
  const activeTypes = enterpriseTypes.filter((item) => item.isActive);
  const activeCategories = categories.filter((item) => item.isActive);
  const detailTypes = enterpriseTypes.filter(
    (item) => item.isActive || item.id === details?.businessType,
  );
  const detailCategories = categories.filter(
    (item) => item.isActive || item.id === details?.category,
  );

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-6xl space-y-6 duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola profil dan akses workspace.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void load(true)}
          disabled={loading || saving}
          icon={<RefreshCw size={16} />}
        >
          Muat ulang
        </Button>
      </div>
      {notice && (
        <div
          role="alert"
          className={`flex gap-2 rounded-lg border p-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          <AlertCircle size={18} />
          {notice.message}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Memuat pengaturan…
        </div>
      ) : (
        <>
          {details && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Business details</h2>
              <form onSubmit={saveDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Business name"
                  disabled={!isCompanyAdmin || saving}
                  value={details.name}
                  onChange={(e) => setDetails({ ...details, name: e.target.value })}
                />
                <Field
                  label="Address"
                  disabled={!isCompanyAdmin || saving}
                  value={details.address}
                  onChange={(e) => setDetails({ ...details, address: e.target.value })}
                />
                <Field
                  label="Phone"
                  disabled={!isCompanyAdmin || saving}
                  value={details.phone}
                  onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                />
                <Field
                  label="Email"
                  type="email"
                  disabled={!isCompanyAdmin || saving}
                  value={details.email ?? ''}
                  onChange={(e) => setDetails({ ...details, email: e.target.value || null })}
                />
                <Field
                  label="Field"
                  disabled={!isCompanyAdmin || saving}
                  value={details.field}
                  onChange={(e) => setDetails({ ...details, field: e.target.value })}
                />
                <Field
                  label="Postal code"
                  disabled={!isCompanyAdmin || saving}
                  value={details.postalCode}
                  onChange={(e) => setDetails({ ...details, postalCode: e.target.value })}
                />
                <label className="block text-sm font-medium text-slate-700">
                  Business type
                  <Select
                    aria-label="Business type"
                    className="mt-1.5"
                    disabled={!isCompanyAdmin || saving}
                    value={details.businessType}
                    onChange={(value) => setDetails({ ...details, businessType: Number(value) })}
                    options={detailTypes.map((type) => ({
                      value: type.id,
                      label: `${type.businessType}${type.isActive ? '' : ' (Nonaktif)'}`,
                      disabled: !type.isActive,
                    }))}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Category
                  <Select
                    aria-label="Category"
                    className="mt-1.5"
                    disabled={!isCompanyAdmin || saving}
                    value={details.category}
                    onChange={(value) => setDetails({ ...details, category: Number(value) })}
                    options={detailCategories.map((category) => ({
                      value: category.id,
                      label: `${category.name}${category.isActive ? '' : ' (Nonaktif)'}`,
                      disabled: !category.isActive,
                    }))}
                  />
                </label>
                {isCompanyAdmin && (
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={saving}>
                      Simpan business details
                    </Button>
                  </div>
                )}
              </form>
            </section>
          )}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                <Users size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Company Profile</h2>
                <p className="text-sm text-slate-500">Identitas perusahaan untuk workspace ini.</p>
              </div>
            </div>
            {!company ? (
              <p
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              >
                Company Profile tidak tersedia untuk akun ini. Hubungi administrator.
              </p>
            ) : (
              <form onSubmit={saveCompanyProfile} className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4 sm:col-span-2">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 p-2">
                    <CompanyLogo
                      company={{
                        id: company.id,
                        name: companyProfile.name || company.name,
                        hasLogo: company.hasLogo,
                        logoVersion: company.logoVersion,
                      }}
                      previewUrl={logoPreviewUrl}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    <p>
                      Preview logo perusahaan. Jika gagal dimuat, initial perusahaan ditampilkan.
                    </p>
                    {logoFile && (
                      <p>
                        {logoFile.name} · {(logoFile.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
                <Field
                  label="Company name"
                  required
                  disabled={!canEditCompanyProfile || saving}
                  value={companyProfile.name}
                  onChange={(event) =>
                    setCompanyProfile({ ...companyProfile, name: event.target.value })
                  }
                />
                <div>
                  <span className="block text-sm font-medium text-slate-700">Company logo</span>
                  <input
                    aria-label="Company logo file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!canEditCompanyProfile || saving}
                    onChange={(event) => selectLogo(event.target.files?.[0] ?? null)}
                    className="mt-1.5 block w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {canEditCompanyProfile && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || !logoFile}
                        onClick={() => void uploadLogo()}
                      >
                        Upload logo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={saving || !company.hasLogo}
                        onClick={() => void removeLogo()}
                      >
                        Hapus logo
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="block text-sm font-medium text-slate-700">
                    Company profile colour
                  </span>
                  <div className="mt-1.5 flex min-w-0 items-center gap-2">
                    <input
                      aria-label="Company profile colour picker"
                      type="color"
                      disabled={!canEditCompanyProfile || saving}
                      value={
                        HEX_COLOUR.test(companyProfile.profileColour)
                          ? companyProfile.profileColour
                          : DEFAULT_COMPANY_BRAND
                      }
                      onChange={(event) =>
                        setCompanyProfile({ ...companyProfile, profileColour: event.target.value })
                      }
                      className="h-10 w-10 flex-none rounded-lg border border-slate-300 bg-white p-1 disabled:bg-slate-100"
                    />
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Nilai warna</span>
                      <input
                        aria-label="Nilai warna"
                        required
                        pattern="#[0-9a-fA-F]{6}"
                        title="Gunakan format #RRGGBB"
                        disabled={!canEditCompanyProfile || saving}
                        value={companyProfile.profileColour}
                        onChange={(event) =>
                          setCompanyProfile({
                            ...companyProfile,
                            profileColour: event.target.value,
                          })
                        }
                        className="block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100"
                      />
                    </label>
                  </div>
                </div>
                {canEditCompanyProfile ? (
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={saving} icon={<Save size={16} />}>
                      Simpan Company Profile
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 sm:col-span-2">
                    Company Profile bersifat view-only untuk role Anda.
                  </p>
                )}
              </form>
            )}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                <UserCog size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Profil saya</h2>
                <p className="text-sm text-slate-500">
                  Email dan username Anda tidak dapat diubah. Anda dapat memperbarui kata sandi.
                </p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                type="email"
                required
                autoComplete="email"
                disabled
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
              <Field
                label="Username"
                required
                autoComplete="username"
                disabled
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              />
              <div className="sm:col-span-2">
                <PasswordField
                  visible={showProfilePassword}
                  onVisibilityChange={() => setShowProfilePassword((current) => !current)}
                  minLength={8}
                  autoComplete="new-password"
                  value={profile.password}
                  onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving} icon={<Save size={16} />}>
                  Simpan profil
                </Button>
              </div>
            </form>
          </section>
          {isKatalokaAdmin && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">Company Management</h2>
                <p className="text-sm text-slate-500">
                  Buat company baru dan arsipkan company yang tidak aktif. Profil existing tidak
                  dapat diedit di area ini.
                </p>
              </div>
              <form
                onSubmit={createCompany}
                className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2"
              >
                <p className="text-sm text-slate-600 md:col-span-2">
                  Field yang ditandai tanda bintang wajib diisi.
                </p>
                <Field
                  label="Company name"
                  required
                  showRequiredIndicator
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                />
                <Field
                  label="Address"
                  required
                  showRequiredIndicator
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                />
                <Field
                  label="Phone"
                  required
                  showRequiredIndicator
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                />
                <Field
                  label="Email (opsional)"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                />
                <Field
                  label="Business field"
                  required
                  showRequiredIndicator
                  value={newCompany.field}
                  onChange={(e) => setNewCompany({ ...newCompany, field: e.target.value })}
                />
                <Field
                  label="Postal code"
                  required
                  showRequiredIndicator
                  value={newCompany.postalCode}
                  onChange={(e) => setNewCompany({ ...newCompany, postalCode: e.target.value })}
                />
                <label className="block text-sm font-medium text-slate-700">
                  Business type
                  <span aria-hidden="true" data-required-marker className="ml-1 text-red-600">
                    *
                  </span>
                  <span className="sr-only"> (wajib)</span>
                  <Select aria-label="Business type (wajib)" className="mt-1.5" required value={newCompany.businessType} onChange={(value) => setNewCompany({ ...newCompany, businessType: String(value) })} options={activeTypes.map((type) => ({ value: type.id, label: type.businessType }))} placeholder="Pilih tipe" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Category
                  <span aria-hidden="true" data-required-marker className="ml-1 text-red-600">
                    *
                  </span>
                  <span className="sr-only"> (wajib)</span>
                  <Select aria-label="Category (wajib)" className="mt-1.5" required value={newCompany.category} onChange={(value) => setNewCompany({ ...newCompany, category: String(value) })} options={activeCategories.map((category) => ({ value: category.id, label: category.name }))} placeholder="Pilih kategori" />
                </label>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={saving} icon={<Plus size={16} />}>
                    Buat company
                  </Button>
                </div>
              </form>
              <ul className="divide-y rounded-lg border border-slate-200">
                {managedCompanies.map((managedCompany) => (
                  <li
                    key={managedCompany.id}
                    className="group flex items-center justify-between gap-3 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{managedCompany.name}</p>
                      <p className="text-xs text-slate-500">
                        {managedCompany.isActive ? 'Aktif' : 'Diarsipkan'}
                      </p>
                    </div>
                    <RowActions aria-label={`Actions for ${managedCompany.name}`} actions={[{ label: managedCompany.isActive ? 'Arsipkan' : 'Aktifkan', icon: <Archive size={15} />, onClick: () => void updateCompanyStatus(managedCompany), tone: managedCompany.isActive ? 'danger' : 'default', disabled: saving }]} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {isKatalokaAdmin && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Company controls</h2>
              <ul className="mt-4 divide-y rounded-lg border border-slate-200">
                {managedCompanies.map((managedCompany) => (
                  <li
                    key={`${managedCompany.id}-controls`}
                    className="group flex items-center justify-between gap-3 p-3"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {managedCompany.name}
                    </span>
                    <RowActions aria-label={`Actions for ${managedCompany.name}`} actions={[{ label: 'Lihat', icon: <Eye size={15} />, onClick: () => void viewCompany(managedCompany.id) }, { label: 'Hapus', icon: <Trash2 size={15} />, onClick: () => void deleteCompany(managedCompany), tone: 'danger', disabled: saving || managedCompany.isActive }]} />
                  </li>
                ))}
              </ul>
              {companyDetail && (
                <div
                  role="status"
                  className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                >
                  <strong>{companyDetail.name}</strong>
                  <span className="ml-2">{companyDetail.isActive ? 'Aktif' : 'Diarsipkan'}</span>
                </div>
              )}
            </section>
          )}
          {isKatalokaAdmin && companyDetail && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Selected company details</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd>{companyDetail.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Address</dt>
                  <dd>{companyDetail.address}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>{companyDetail.phone}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd>{companyDetail.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Field</dt>
                  <dd>{companyDetail.field}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Postal code</dt>
                  <dd>{companyDetail.postalCode}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Business type</dt>
                  <dd>
                    {enterpriseTypes.find((item) => item.id === companyDetail.businessType)
                      ?.businessType ?? companyDetail.businessType}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd>
                    {categories.find((item) => item.id === companyDetail.category)?.name ??
                      companyDetail.category}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          {isKatalokaAdmin && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Business Type and Category</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kelola nama, deskripsi, dan status katalog. Status nonaktif tidak tersedia untuk
                company baru.
              </p>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="font-medium text-slate-800">Business type</h3>
                  <form
                    onSubmit={(event) => void createMaster('type', event)}
                    className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3"
                  >
                    <Field
                      label="Type ID"
                      required
                      disabled={saving || editingMaster?.kind === 'type'}
                      type="number"
                      placeholder="Contoh: 1"
                      value={newType.id}
                      onChange={(e) => setNewType({ ...newType, id: e.target.value })}
                    />
                    <Field
                      label="Business type name"
                      required
                      placeholder="Contoh: Perseroan Terbatas"
                      value={newType.businessType}
                      onChange={(e) => setNewType({ ...newType, businessType: e.target.value })}
                    />
                    <Field
                      label="Description (optional)"
                      placeholder="Penjelasan singkat tipe badan usaha"
                      value={newType.description}
                      onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        aria-label="Legal entity"
                        type="checkbox"
                        checked={newType.legalEntity}
                        onChange={(e) => setNewType({ ...newType, legalEntity: e.target.checked })}
                      />{' '}
                      Legal entity
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        aria-label="Business type active"
                        type="checkbox"
                        checked={newType.isActive}
                        onChange={(e) => setNewType({ ...newType, isActive: e.target.checked })}
                      />{' '}
                      Aktif
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {editingMaster?.kind === 'type' ? 'Simpan type' : 'Tambah type'}
                      </Button>
                      {editingMaster?.kind === 'type' && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingMaster(null);
                            setNewType({
                              id: '',
                              businessType: '',
                              description: '',
                              legalEntity: false,
                              isActive: true,
                            });
                          }}
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  </form>
                  <ul className="mt-3 divide-y rounded border">
                    {enterpriseTypes.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-center justify-between gap-2 p-2 text-sm"
                      >
                        <span>
                          {item.businessType} · {item.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <RowActions aria-label={`Actions for ${item.businessType}`} actions={[{ label: 'Ubah', icon: <Pencil size={15} />, onClick: () => editMaster('type', item), disabled: saving }, { label: 'Hapus', icon: <Trash2 size={15} />, onClick: () => void removeMaster('type', item.id), tone: 'danger', disabled: saving }]} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Category</h3>
                  <form
                    onSubmit={(event) => void createMaster('category', event)}
                    className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3"
                  >
                    <Field
                      label="Category ID"
                      required
                      disabled={saving || editingMaster?.kind === 'category'}
                      type="number"
                      placeholder="Contoh: 1"
                      value={newCategory.id}
                      onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value })}
                    />
                    <Field
                      label="Category code"
                      required
                      placeholder="Contoh: TECHNOLOGY"
                      value={newCategory.code}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })
                      }
                    />
                    <Field
                      label="Category name"
                      required
                      placeholder="Contoh: Technology"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                    <Field
                      label="Description (optional)"
                      placeholder="Penjelasan singkat kategori"
                      value={newCategory.description}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, description: e.target.value })
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        aria-label="Category active"
                        type="checkbox"
                        checked={newCategory.isActive}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, isActive: e.target.checked })
                        }
                      />{' '}
                      Aktif
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {editingMaster?.kind === 'category' ? 'Simpan category' : 'Tambah category'}
                      </Button>
                      {editingMaster?.kind === 'category' && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingMaster(null);
                            setNewCategory({
                              id: '',
                              code: '',
                              name: '',
                              description: '',
                              isActive: true,
                            });
                          }}
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  </form>
                  <ul className="mt-3 divide-y rounded border">
                    {categories.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-center justify-between gap-2 p-2 text-sm"
                      >
                        <span>
                          {item.name} · {item.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <RowActions aria-label={`Actions for ${item.name}`} actions={[{ label: 'Ubah', icon: <Pencil size={15} />, onClick: () => editMaster('category', item), disabled: saving }, { label: 'Hapus', icon: <Trash2 size={15} />, onClick: () => void removeMaster('category', item.id), tone: 'danger', disabled: saving }]} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
          {isAdmin && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Akun pengguna</h2>
                    <p className="text-sm text-slate-500">
                      Buat dan kelola akses anggota workspace.
                    </p>
                  </div>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setAppliedUserFilters(
                      isKatalokaAdmin ? userFilters : { q: userFilters.q, companyId: '' },
                    );
                  }}
                  className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <Field
                    label="Cari email atau username"
                    value={userFilters.q}
                    onChange={(event) => setUserFilters({ ...userFilters, q: event.target.value })}
                  />
                  {isKatalokaAdmin && (
                    <label className="block text-sm font-medium text-slate-700">
                      Filter company
                      <Select aria-label="Filter company" className="mt-1.5" value={userFilters.companyId} onChange={(value) => setUserFilters({ ...userFilters, companyId: String(value) })} options={managedCompanies.map((managedCompany) => ({ value: managedCompany.id, label: managedCompany.name }))} placeholder="Semua company" />
                    </label>
                  )}
                  <div className="flex items-end">
                    <Button type="submit" variant="secondary">
                      Filter
                    </Button>
                  </div>
                </form>
                <form
                  onSubmit={createUser}
                  className="mb-6 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 md:items-end"
                >
                  <Field
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <Field
                    label="Username"
                    required
                    autoComplete="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                  <Field
                    label="Kata sandi"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <label htmlFor="new-user-role" className="text-sm font-medium text-slate-700">
                        Role
                      </label>
                      {!isKatalokaAdmin && (
                        <span
                          className="group relative inline-flex cursor-help text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          tabIndex={0}
                          aria-label="Bantuan batasan role akun"
                          aria-describedby="new-user-role-help"
                        >
                          (i)
                          <span
                            id="new-user-role-help"
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                          >
                            Admin company hanya dapat membuat akun QA untuk company sendiri.
                          </span>
                        </span>
                      )}
                    </div>
                    <Select aria-label="Role" className="mt-1.5" value={newUser.roleSlug} onChange={(value) => setNewUser({ ...newUser, roleSlug: String(value) })} options={createUserRoles.map((role) => ({ value: role.slug, label: role.name ?? role.slug }))} />
                  </div>
                  {isKatalokaAdmin && (
                    <label className="block text-sm font-medium text-slate-700">
                      Company
                      <Select aria-label="Company untuk akun baru" className="mt-1.5" value={newUser.companyId} onChange={(value) => setNewUser({ ...newUser, companyId: String(value) })} options={managedCompanies.filter((managedCompany) => managedCompany.isActive).map((managedCompany) => ({ value: managedCompany.id, label: managedCompany.name }))} placeholder="Pilih company" />
                    </label>
                  )}
                  <div className="flex md:self-end">
                    <Button type="submit" disabled={saving} icon={<Plus size={16} />}>
                      {saving ? 'Menambahkan…' : 'Tambah'}
                    </Button>
                  </div>
                </form>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-slate-500">
                      <tr>
                        <th className="p-3">Pengguna</th>
                        {isKatalokaAdmin && <th className="p-3">Company</th>}
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">
                          <span className="sr-only">Aksi</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <Fragment key={user.id}>
                          <tr key={user.id} className="group border-b">
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{user.username}</div>
                              <div className="text-slate-500">{user.email}</div>
                            </td>
                            {isKatalokaAdmin && (
                              <td className="p-3 text-slate-600">{user.company?.name ?? '—'}</td>
                            )}
                            <td className="p-3">{user.roleSlug}</td>
                            <td className="p-3">{user.isActive ? 'Aktif' : 'Nonaktif'}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                {isCompanyAdmin && user.roleSlug.toLowerCase() !== 'admin' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => void openAssignments(user)}
                                  >
                                    Project
                                  </Button>
                                )}
                                <RowActions aria-label={`Actions for ${user.username}`} actions={[
                                  { label: 'Ubah', icon: <Pencil size={15} />, onClick: () => beginUserEdit(user), disabled: saving },
                                  ...(user.id === sessionUserId || user.id === me?.id ? [{ label: 'Hapus', tooltip: 'Akun Anda tidak dapat dihapus.', icon: <Trash2 size={15} />, onClick: () => {}, tone: 'danger' as const, disabled: true }] : [{ label: 'Hapus', icon: <Trash2 size={15} />, onClick: () => void deleteUser(user), tone: 'danger' as const, disabled: saving }]),
                                ]} />
                              </div>
                            </td>
                          </tr>
                          {editingUser?.id === user.id && (
                            <tr key={`${user.id}-editor`} className="border-b bg-slate-50">
                              <td colSpan={isKatalokaAdmin ? 5 : 4} className="p-4">
                                <form onSubmit={saveUserEdit} className="grid gap-3 md:grid-cols-2">
                                  <Field
                                    label="Email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={editingUser.email}
                                    onChange={(e) =>
                                      setEditingUser({ ...editingUser, email: e.target.value })
                                    }
                                  />
                                  <Field
                                    label="Username"
                                    required
                                    autoComplete="username"
                                    value={editingUser.username}
                                    onChange={(e) =>
                                      setEditingUser({ ...editingUser, username: e.target.value })
                                    }
                                  />
                                  <Field
                                    label="Kata sandi baru (opsional)"
                                    type="password"
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={editingUser.password}
                                    onChange={(e) =>
                                      setEditingUser({ ...editingUser, password: e.target.value })
                                    }
                                  />
                                  <label className="block text-sm font-medium text-slate-700">
                                    Role
                                    <Select aria-label="Role" className="mt-1.5" value={editingUser.roleSlug} onChange={(value) => setEditingUser({ ...editingUser, roleSlug: String(value) })} options={editableRoles.map((role) => ({ value: role.slug, label: roleLabel(role) }))} />
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={editingUser.isActive}
                                      onChange={(e) =>
                                        setEditingUser({
                                          ...editingUser,
                                          isActive: e.target.checked,
                                        })
                                      }
                                    />
                                    Akun aktif
                                  </label>
                                  <div className="flex items-end justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      disabled={saving}
                                      onClick={() => setEditingUser(null)}
                                    >
                                      Batal
                                    </Button>
                                    <Button
                                      type="submit"
                                      disabled={saving}
                                      icon={<Save size={16} />}
                                    >
                                      Simpan akun
                                    </Button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {isKatalokaAdmin && (
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Role</h2>
                      <p className="text-sm text-slate-500">
                        Tambahkan role untuk penugasan akun mendatang.
                      </p>
                    </div>
                  </div>
                  <form
                    noValidate
                    onSubmit={createRole}
                    className="mb-8 grid gap-3 md:grid-cols-4 md:items-end"
                  >
                    <div>
                      <div className="flex items-center gap-1">
                        <label htmlFor="role-slug" className="text-sm font-medium text-slate-700">
                          Slug
                        </label>
                        <span
                          className="group relative inline-flex cursor-help text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          tabIndex={0}
                          aria-label="Bantuan format slug role"
                          aria-describedby="role-slug-help"
                        >
                          (i)
                          <span
                            id="role-slug-help"
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-max max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                          >
                            2-50 karakter: huruf kecil, angka, atau tanda hubung.
                          </span>
                        </span>
                      </div>
                      <input
                        id="role-slug"
                        required
                        minLength={2}
                        maxLength={50}
                        pattern="[a-z0-9-]{2,50}"
                        title="2-50 huruf kecil, angka, atau tanda hubung"
                        value={newRole.slug}
                        onChange={(e) => setNewRole({ ...newRole, slug: e.target.value })}
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100"
                      />
                    </div>
                    <Field
                      label="Nama"
                      required
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    />
                    <Field
                      label="Deskripsi"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    />
                    <div className="flex md:self-end">
                      <Button type="submit" disabled={saving} icon={<Plus size={16} />}>
                        Tambah role
                      </Button>
                    </div>
                  </form>
                  <ul className="divide-y rounded-lg border border-slate-200">
                    {roles.map((role) => (
                      <li key={role.slug} className="flex items-center justify-between gap-4 p-3">
                        <div>
                          <span className="font-medium text-slate-800">
                            {role.name ?? role.slug}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">{role.slug}</span>
                          {role.isActive === false && (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Nonaktif
                            </span>
                          )}
                          {role.description && (
                            <p className="text-sm text-slate-500">{role.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <RowActions aria-label={`Actions for ${role.name ?? role.slug}`} actions={[{ label: 'Ubah', icon: <Pencil size={15} />, onClick: () => void editRole(role), disabled: saving }, ...(role.slug === 'kataloka_admin' ? [{ label: 'Hapus', tooltip: 'Role platform Kataloka Admin tidak dapat dihapus.', icon: <Trash2 size={15} />, onClick: () => {}, tone: 'danger' as const, disabled: true }] : [{ label: 'Hapus', icon: <Trash2 size={15} />, onClick: () => void deleteRole(role), tone: 'danger' as const, disabled: saving }])]} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Katalog Section Test Case</h2>
                <p className="text-sm text-slate-500">
                  Kelola pilihan Section untuk project yang dapat Anda akses.
                </p>
              </div>
            </div>
            {projects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Anda belum memiliki akses ke project mana pun.
              </p>
            ) : (
              <>
                <label className="mb-4 block max-w-xl text-sm font-medium text-slate-700">
                  Project
                  <Select aria-label="Project katalog Section" className="mt-1.5" value={selectedSectionProjectId} onChange={(value) => setSelectedSectionProjectId(String(value))} options={projects.map((project) => ({ value: project.id, label: `${project.key ?? project.name} — ${project.name}` }))} />
                </label>
                <form onSubmit={createSection} className="mb-4 flex max-w-xl gap-3">
                  <input
                    required
                    maxLength={150}
                    value={newSectionName}
                    onChange={(event) => setNewSectionName(event.target.value)}
                    placeholder="Nama Section"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <Button
                    type="submit"
                    disabled={saving || !selectedSectionProjectId}
                    icon={<Plus size={16} />}
                  >
                    Tambah Section
                  </Button>
                </form>
                <ul className="divide-y rounded-lg border border-slate-200">
                  {sections.length === 0 ? (
                    <li className="p-3 text-sm text-slate-500">
                      Belum ada Section untuk project ini.
                    </li>
                  ) : (
                    sections.map((section) => (
                      <li key={section.id} className="group flex items-center justify-between gap-4 p-3">
                        <span className="text-sm font-medium text-slate-800">{section.name}</span>
                        <div className="flex gap-2">
                          <RowActions aria-label={`Actions for ${section.name}`} actions={[{ label: 'Edit', icon: <Pencil size={15} />, onClick: () => void editSection(section), disabled: saving }, { label: 'Delete', icon: <Trash2 size={15} />, onClick: () => void deleteSection(section), tone: 'danger', disabled: saving }]} />
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </section>
        </>
      )}
      {isCompanyAdmin && assignmentUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-title"
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 id="assignment-title" className="font-semibold text-slate-900">
                  Assignment project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pilih project yang dapat diakses oleh{' '}
                  {assignmentUser.username || assignmentUser.email}.
                </p>
              </div>
              <button
                aria-label="Tutup dialog"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setAssignmentUser(null)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">
              {assignmentLoading ? (
                <p className="text-sm text-slate-500">Memuat assignment…</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada project untuk di-assign.</p>
              ) : (
                projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={assignedProjectIds.includes(project.id)}
                      onChange={(event) =>
                        setAssignedProjectIds((current) =>
                          event.target.checked
                            ? [...current, project.id]
                            : current.filter((id) => id !== project.id),
                        )
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        {project.name}
                      </span>
                      {project.key && <span className="text-xs text-slate-500">{project.key}</span>}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <Button variant="secondary" onClick={() => setAssignmentUser(null)} disabled={saving}>
                Batal
              </Button>
              <Button
                onClick={() => void saveAssignments()}
                disabled={saving || assignmentLoading}
                icon={<Save size={16} />}
              >
                Simpan assignment
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        variant="danger"
        confirmLabel="Hapus"
        onConfirm={() => confirmation?.onConfirm()}
        onClose={() => setConfirmation(null)}
      />
      <PromptModal
        key={`${settingsPrompt?.title ?? 'closed'}-${settingsPrompt?.initialValue ?? ''}`}
        isOpen={Boolean(settingsPrompt)}
        title={settingsPrompt?.title ?? ''}
        label={settingsPrompt?.label ?? ''}
        initialValue={settingsPrompt?.initialValue ?? ''}
        submitLabel="Simpan"
        onSubmit={(value) => settingsPrompt?.onSubmit(value)}
        onClose={() => setSettingsPrompt(null)}
      />
    </div>
  );
};
