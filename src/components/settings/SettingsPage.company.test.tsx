/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionContext } from '@/src/auth/SessionContext.tsx';
import { selectCustomOption } from '@/src/test/selectTestUtils.ts';
import { sectionCatalogStore } from '@/src/state/section-catalog.ts';

const company = { id: 'c1', name: 'Acme', hasLogo: false, logoVersion: null, profileColour: '#123456' };
const companies = vi.hoisted(() => ({ getProfile: vi.fn(), updateProfile: vi.fn(), getLogoBlob: vi.fn(), uploadLogo: vi.fn(), removeLogo: vi.fn(), getDetails: vi.fn(), updateDetails: vi.fn(), listManaged: vi.fn(), createManaged: vi.fn(), updateManagedStatus: vi.fn(), getManaged: vi.fn(), deleteManaged: vi.fn(), listCategories: vi.fn(), listTypes: vi.fn(), updateType: vi.fn(), updateCategory: vi.fn() }));
const users = vi.hoisted(() => ({ getMe: vi.fn(), updateMe: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), getProjectAssignments: vi.fn(), updateProjectAssignments: vi.fn() }));
const roles = vi.hoisted(() => ({ list: vi.fn(), assignable: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
const projects = vi.hoisted(() => ({ list: vi.fn() }));
const sections = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
const areas = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('@/src/api/companies.service.ts', () => ({ CompaniesService: companies }));
vi.mock('@/src/api/users.service.ts', () => ({ UsersService: users, RolesService: roles }));
vi.mock('@/src/api/projects.service.ts', () => ({ ProjectsService: projects, SectionsService: sections }));
vi.mock('@/src/api/user-flow-areas.service.ts', () => ({ UserFlowAreasService: areas }));

import { SettingsPage } from './SettingsPage.tsx';

const me = { id: 'u1', email: 'admin@example.test', username: 'admin', roleSlug: 'admin', isActive: true };
const renderSettings = (roleSlug = 'admin') => {
  users.getMe.mockResolvedValue({ data: { ...me, roleSlug } });
  return render(<SessionContext.Provider value={{ ...me, roleSlug, company }}><SettingsPage /></SessionContext.Provider>);
};

describe('SettingsPage Company Profile', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  beforeEach(() => {
    vi.clearAllMocks();
    sectionCatalogStore.clearProject('p1');
    sectionCatalogStore.clearProject('p2');
    companies.getLogoBlob.mockRejectedValue({ message: 'No logo blob' });
    users.getMe.mockResolvedValue({ data: me });
    companies.getProfile.mockResolvedValue({ data: company });
    companies.getDetails.mockResolvedValue({ data: { ...company, businessType: 1, category: 1, address: 'Jakarta', phone: '0812', email: null, field: 'Tech', postalCode: '12345', isActive: true } });
    companies.listManaged.mockResolvedValue({ data: [{ ...company, businessType: 1, category: 1, address: 'Jakarta', phone: '0812', email: null, field: 'Tech', postalCode: '12345', isActive: true }] });
    companies.listCategories.mockResolvedValue({ data: [{ id: 1, code: 'MICRO', name: 'Micro', isActive: true }] });
    companies.listTypes.mockResolvedValue({ data: [{ id: 1, businessType: 'PT', isActive: true }] });
    companies.getManaged.mockResolvedValue({ data: { ...company, isActive: false } });
    roles.list.mockResolvedValue({ data: [] }); roles.assignable.mockResolvedValue({ data: [] }); users.list.mockResolvedValue({ data: [] }); projects.list.mockResolvedValue({ data: [] }); sections.list.mockResolvedValue({ data: [] }); areas.list.mockResolvedValue({ data: [] });
  });

  it('renders the Area catalog before the Section catalog', async () => {
    renderSettings('qa');
    await screen.findByRole('heading', { name: 'Katalog Section Test Case' });
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings.indexOf('Katalog Area User Flow')).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf('Katalog Area User Flow')).toBeLessThan(headings.indexOf('Katalog Section Test Case'));
  });

  it('lets an authorized non-admin manage the selected project Area catalog', async () => {
    const user = userEvent.setup();
    projects.list.mockResolvedValue({ data: [{ id: 'p1', name: 'Project One', key: 'ONE' }] });
    areas.list.mockResolvedValue({ data: [] });
    areas.create.mockResolvedValue({ data: { id: 'a1', name: 'Payments', usageCount: 0 } });
    renderSettings('qa');
    await screen.findByRole('heading', { name: 'Katalog Area User Flow' });
    await user.type(screen.getByPlaceholderText('Nama Area'), 'Payments');
    await user.click(screen.getByRole('button', { name: 'Tambah Area' }));
    await waitFor(() => expect(areas.create).toHaveBeenCalledWith('p1', { name: 'Payments' }));
  });

  it('shows Edit and Delete actions for an authorized Area row', async () => {
    projects.list.mockResolvedValue({ data: [{ id: 'p1', name: 'Project One', key: 'ONE' }] });
    areas.list.mockResolvedValue({ data: [{ id: 'a1', name: 'Payments', usageCount: 0 }] });
    renderSettings('qa');
    await screen.findByText('Payments');
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not expose Area mutations to a viewer', async () => {
    renderSettings('viewer');
    await screen.findByRole('heading', { name: 'Katalog Area User Flow' });
    expect(screen.queryByRole('button', { name: 'Tambah Area' })).toBeNull();
    expect(screen.queryByPlaceholderText('Nama Area')).toBeNull();
  });

  it('keeps profile email and username disabled while allowing the new password to be shown', async () => {
    const user = userEvent.setup();
    renderSettings('qa');
    const profileSection = (await screen.findByRole('heading', { name: 'Profil saya' })).closest('section')!;
    const email = within(profileSection).getByLabelText('Email') as HTMLInputElement;
    const username = within(profileSection).getByLabelText('Username') as HTMLInputElement;
    const password = within(profileSection).getByLabelText('Kata sandi baru (opsional)') as HTMLInputElement;

    expect(email.disabled).toBe(true);
    expect(username.disabled).toBe(true);
    expect(password.type).toBe('password');
    await user.type(password, 'password123');
    await user.click(within(profileSection).getByRole('button', { name: 'Tampilkan kata sandi baru' }));
    expect(password.type).toBe('text');
    expect(password.value).toBe('password123');
    expect(within(profileSection).getByRole('button', { name: 'Sembunyikan kata sandi baru' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('lets an admin update the agreed company profile fields', async () => {
    const user = userEvent.setup();
    companies.updateProfile.mockResolvedValue({ data: { ...company, name: 'Acme Updated', profileColour: '#abcdef' } });
    renderSettings();
    await screen.findByRole('heading', { name: 'Company Profile' });
    expect(screen.getByLabelText('Company profile colour picker').className).toContain('w-10');
    expect(screen.getByLabelText('Nilai warna').className).toContain('w-full');
    expect(screen.getByLabelText('Company profile colour picker').parentElement?.className).toContain('gap-2');
    expect(screen.getByLabelText('Company profile colour picker').parentElement?.parentElement?.className).not.toContain('sm:col-span-2');
    expect(screen.getByText('Nilai warna').className).toContain('sr-only');
    await user.clear(screen.getByLabelText('Company name'));
    await user.type(screen.getByLabelText('Company name'), 'Acme Updated');
    fireEvent.change(screen.getByLabelText('Nilai warna'), { target: { value: '#abcdef' } });
    await user.click(screen.getByRole('button', { name: 'Simpan Company Profile' }));
    await waitFor(() => expect(companies.updateProfile).toHaveBeenCalledWith({ name: 'Acme Updated', profileColour: '#abcdef' }));
  });

  it('validates and uploads a PNG logo through the blob endpoint', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
    const file = new File(['logo'], 'acme.png', { type: 'image/png' });
    companies.uploadLogo.mockResolvedValue({ data: { hasLogo: true, logoVersion: 'v2' } });
    renderSettings();
    await screen.findByRole('heading', { name: 'Company Profile' });
    fireEvent.change(screen.getByLabelText('Company logo file'), { target: { files: [file] } });
    expect(screen.getByText('acme.png · 0.0 KB')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Upload logo' }));
    await waitFor(() => expect(companies.uploadLogo).toHaveBeenCalledWith(file));
  });

  it('rejects unsupported and oversized logo files before upload', async () => {
    renderSettings();
    await screen.findByRole('heading', { name: 'Company Profile' });
    fireEvent.change(screen.getByLabelText('Company logo file'), { target: { files: [new File(['svg'], 'logo.svg', { type: 'image/svg+xml' })] } });
    expect(screen.getByRole('alert').textContent).toContain('PNG, JPEG, atau WebP');
    expect(companies.uploadLogo).not.toHaveBeenCalled();
  });

  it('removes an existing company logo and updates metadata', async () => {
    const user = userEvent.setup();
    companies.getProfile.mockResolvedValue({ data: { ...company, hasLogo: true, logoVersion: 'v1' } });
    companies.removeLogo.mockResolvedValue({ data: { hasLogo: false, logoVersion: null } });
    renderSettings();
    await screen.findByRole('heading', { name: 'Company Profile' });
    await user.click(screen.getByRole('button', { name: 'Hapus logo' }));
    await waitFor(() => expect(companies.removeLogo).toHaveBeenCalled());
  });

  it('keeps every company field view-only for a non-admin', async () => {
    renderSettings('qa');
    await screen.findByRole('heading', { name: 'Company Profile' });
    expect(screen.getAllByLabelText('Company name')[0].hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Company logo file').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Company profile colour picker').hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Simpan Company Profile' })).toBeNull();
    expect(companies.updateProfile).not.toHaveBeenCalled();
  });

  it('lets a non-admin project member manage only the selected project section catalog', async () => {
    const user = userEvent.setup();
    projects.list.mockResolvedValue({ data: [{ id: 'p1', name: 'Project One', key: 'ONE' }, { id: 'p2', name: 'Project Two', key: 'TWO' }] });
    sections.list.mockImplementation((projectId: string) => Promise.resolve({ data: projectId === 'p1' ? [{ id: 's1', name: 'General', projectId: 'p1' }] : [{ id: 's2', name: 'Regression', projectId: 'p2' }] }));
    sections.create.mockResolvedValue({ data: { id: 's3', name: 'Payments', projectId: 'p2' } });
    renderSettings('qa');
    await screen.findByRole('heading', { name: 'Katalog Section Test Case' });
    expect(await screen.findByText('General')).not.toBeNull();
    await selectCustomOption(user, 'Project katalog Section', 'p2');
    expect(await screen.findByText('Regression')).not.toBeNull();
    await user.type(screen.getByPlaceholderText('Nama Section'), 'Payments');
    await user.click(screen.getByRole('button', { name: 'Tambah Section' }));
    await waitFor(() => expect(sections.create).toHaveBeenCalledWith('p2', { name: 'Payments' }));
    expect(sections.list).toHaveBeenCalledWith('p2', expect.anything());
  });

  it('shows the selected business type and category as read-only for a QA user', async () => {
    renderSettings('qa');
    await screen.findByRole('heading', { name: 'Business details' });
    const businessType = screen.getByLabelText('Business type') as HTMLButtonElement;
    const category = screen.getByLabelText('Category') as HTMLButtonElement;
    expect(businessType.disabled).toBe(true);
    expect(category.disabled).toBe(true);
    expect(businessType.getAttribute('value')).toBe('1');
    expect(category.getAttribute('value')).toBe('1');
    expect(businessType.textContent).toContain('PT');
    expect(category.textContent).toContain('Micro');
  });

  it('offers project assignments to a company admin', async () => {
    users.list.mockResolvedValue({ data: [{ ...me, id: 'u2', roleSlug: 'qa' }] });
    renderSettings('admin');
    await screen.findByRole('heading', { name: 'Akun pengguna' });
    expect(screen.getByRole('button', { name: 'Project' })).not.toBeNull();
  });

  it('removes project assignments when profile revalidation changes an admin session to kataloka_admin', async () => {
    users.getMe.mockResolvedValue({ data: { ...me, roleSlug: 'kataloka_admin' } });
    users.list.mockResolvedValue({ data: [{ ...me, id: 'u2', roleSlug: 'qa' }] });
    render(<SessionContext.Provider value={{ ...me, company }}><SettingsPage /></SessionContext.Provider>);

    await screen.findByRole('heading', { name: 'Akun pengguna' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Project' })).toBeNull());
  });

  it('removes an open assignment dialog when revalidation changes admin to kataloka_admin', async () => {
    const user = userEvent.setup();
    users.getMe.mockResolvedValueOnce({ data: me }).mockResolvedValueOnce({ data: { ...me, roleSlug: 'kataloka_admin' } });
    users.list.mockResolvedValue({ data: [{ ...me, id: 'u2', roleSlug: 'qa' }] });
    users.getProjectAssignments.mockResolvedValue({ data: { projectIds: [] } });
    render(<SessionContext.Provider value={{ ...me, company }}><SettingsPage /></SessionContext.Provider>);

    await user.click(await screen.findByRole('button', { name: 'Project' }));
    expect(await screen.findByRole('dialog', { name: 'Assignment project' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Muat ulang' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assignment project' })).toBeNull());
  });

  it('hides role CRUD from a company admin', async () => {
    renderSettings('admin');
    await screen.findByRole('heading', { name: 'Akun pengguna' });
    expect(screen.queryByRole('heading', { name: 'Role' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tambah role' })).toBeNull();
  });

  it('uses assignable roles for a company admin without requesting KA-only global roles', async () => {
    const user = userEvent.setup();
    roles.list.mockRejectedValue({ status: 403, message: 'Forbidden' });
    roles.assignable.mockResolvedValue({ data: [{ slug: 'admin', name: 'Admin', isActive: true }, { slug: 'qa', name: 'QA', isActive: true }] });
    users.create.mockResolvedValue({ data: { ...me, id: 'u2', roleSlug: 'qa' } });
    renderSettings('admin');
    await screen.findByRole('heading', { name: 'Akun pengguna' });
    expect(roles.assignable).toHaveBeenCalled();
    expect(roles.list).not.toHaveBeenCalled();
    expect(users.list).toHaveBeenCalledWith({ force: true }, { q: '' });
    const userSection = screen.getByRole('heading', { name: 'Akun pengguna' }).closest('section')!;
    const newRole = within(userSection).getByLabelText('Role');
    await user.click(newRole);
    expect(screen.getByRole('option', { name: 'QA' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'Admin' })).toBeNull();
    await user.keyboard('{Escape}');
    const roleHelp = screen.getByRole('tooltip', { name: 'Admin company hanya dapat membuat akun QA untuk company sendiri.' });
    expect(roleHelp.parentElement?.getAttribute('aria-describedby')).toBe('new-user-role-help');
    expect(roleHelp.parentElement?.getAttribute('tabindex')).toBe('0');
    expect(roleHelp.className).toContain('group-hover:opacity-100');
    expect(roleHelp.className).toContain('group-focus:opacity-100');
    expect(userSection.querySelector('form.mb-6')?.className).toContain('md:items-end');
    expect(within(userSection).getByRole('button', { name: 'Tambah' }).parentElement?.className).toContain('md:self-end');
    await user.type(within(userSection).getByLabelText('Email'), 'qa@example.test');
    await user.type(within(userSection).getByLabelText('Username'), 'qa-user');
    await user.type(within(userSection).getByLabelText('Kata sandi'), 'password123');
    await user.click(within(userSection).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(users.create).toHaveBeenCalledWith({ email: 'qa@example.test', username: 'qa-user', password: 'password123', roleSlug: 'qa', isActive: true }));
  });

  it('creates a user once, refreshes the list, and confirms the completed action', async () => {
    const user = userEvent.setup();
    let releaseCreate: (() => void) | undefined;
    users.create.mockImplementation(async () => {
      await new Promise<void>((resolve) => { releaseCreate = resolve; });
      return { data: me };
    });
    roles.assignable.mockResolvedValue({ data: [{ slug: 'qa', name: 'QA', isActive: true }] });
    renderSettings('admin');
    const userSection = (await screen.findByRole('heading', { name: 'Akun pengguna' })).closest('section')!;
    await user.type(within(userSection).getByLabelText('Email'), 'qa@example.test');
    await user.type(within(userSection).getByLabelText('Username'), 'qa-user');
    await user.type(within(userSection).getByLabelText('Kata sandi'), 'password123');
    await user.click(within(userSection).getByRole('button', { name: 'Tambah' }));
    expect(within(userSection).getByRole('button', { name: 'Menambahkan…' }).hasAttribute('disabled')).toBe(true);
    fireEvent.submit(within(userSection).getByRole('button', { name: 'Menambahkan…' }).closest('form')!);
    expect(users.create).toHaveBeenCalledTimes(1);
    releaseCreate?.();
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Akun pengguna berhasil ditambahkan.'));
    expect((within(userSection).getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect(users.list).toHaveBeenCalledTimes(2);
  });

  it('keeps user fields and shows the API error when creation fails', async () => {
    const user = userEvent.setup();
    users.create.mockRejectedValue({ message: 'Email sudah digunakan.' });
    roles.assignable.mockResolvedValue({ data: [{ slug: 'qa', name: 'QA', isActive: true }] });
    renderSettings('admin');
    const userSection = (await screen.findByRole('heading', { name: 'Akun pengguna' })).closest('section')!;
    await user.type(within(userSection).getByLabelText('Email'), 'qa@example.test');
    await user.type(within(userSection).getByLabelText('Username'), 'qa-user');
    await user.type(within(userSection).getByLabelText('Kata sandi'), 'password123');
    await user.click(within(userSection).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Email sudah digunakan.'));
    expect((within(userSection).getByLabelText('Email') as HTMLInputElement).value).toBe('qa@example.test');
    expect((within(userSection).getByLabelText('Username') as HTMLInputElement).value).toBe('qa-user');
  });

  it('allows a Kataloka admin to select every active non-reserved role for a new user', async () => {
    const user = userEvent.setup();
    roles.list.mockResolvedValue({ data: [{ slug: 'admin', name: 'Admin', isActive: true }, { slug: 'qa', name: 'QA', isActive: true }, { slug: 'kataloka_admin', name: 'Kataloka Admin', isActive: true }, { slug: 'legacy', name: 'Legacy', isActive: false }] });
    users.create.mockResolvedValue({ data: { ...me, id: 'u2', roleSlug: 'admin' } });
    renderSettings('kataloka_admin');
    const userSection = (await screen.findByRole('heading', { name: 'Akun pengguna' })).closest('section')!;
    const newRole = within(userSection).getByLabelText('Role');
    await user.click(newRole);
    expect(screen.getByRole('option', { name: 'Admin' })).not.toBeNull();
    expect(screen.getByRole('option', { name: 'QA' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'Kataloka Admin' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Legacy' })).toBeNull();
    await user.keyboard('{Escape}');
    await selectCustomOption(user, 'Role', 'admin');
    await selectCustomOption(user, 'Company untuk akun baru', 'c1');
    await user.type(within(userSection).getByLabelText('Email'), 'admin@example.test');
    await user.type(within(userSection).getByLabelText('Username'), 'admin-user');
    await user.type(within(userSection).getByLabelText('Kata sandi'), 'password123');
    await user.click(within(userSection).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(users.create).toHaveBeenCalledWith({ email: 'admin@example.test', username: 'admin-user', password: 'password123', roleSlug: 'admin', isActive: true, companyId: 'c1' }));
  });

  it('submits the first available role when the initial QA role is unavailable', async () => {
    const user = userEvent.setup();
    roles.list.mockResolvedValue({ data: [{ slug: 'admin', name: 'Admin', isActive: true }, { slug: 'kataloka_admin', name: 'Kataloka Admin', isActive: true }] });
    users.create.mockResolvedValue({ data: { ...me, id: 'u2', roleSlug: 'admin' } });
    renderSettings('kataloka_admin');
    const userSection = (await screen.findByRole('heading', { name: 'Akun pengguna' })).closest('section')!;
    await waitFor(() => expect(within(userSection).getByLabelText('Role').getAttribute('value')).toBe('admin'));
    await selectCustomOption(user, 'Company untuk akun baru', 'c1');
    await user.type(within(userSection).getByLabelText('Email'), 'new-admin@example.test');
    await user.type(within(userSection).getByLabelText('Username'), 'new-admin');
    await user.type(within(userSection).getByLabelText('Kata sandi'), 'password123');
    await user.click(within(userSection).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(users.create).toHaveBeenCalledWith({ email: 'new-admin@example.test', username: 'new-admin', password: 'password123', roleSlug: 'admin', isActive: true, companyId: 'c1' }));
  });

  it('keeps Company Profile view-only and exposes global company/user controls for kataloka_admin', async () => {
    roles.list.mockResolvedValue({ data: [{ slug: 'qa', name: 'QA' }, { slug: 'kataloka_admin', name: 'Kataloka Admin' }] });
    users.list.mockResolvedValue({ data: [{ ...me, id: 'u2', roleSlug: 'qa', company: { id: 'c1', name: 'Acme' } }] });
    renderSettings('kataloka_admin');
    expect(await screen.findByRole('heading', { name: 'Company Management' })).not.toBeNull();
    expect(screen.getAllByLabelText('Company name')[0].hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Simpan Company Profile' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Company' })).not.toBeNull();
    expect(screen.getByLabelText('Company untuk akun baru')).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'Kataloka Admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Project' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Role' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tambah role' })).not.toBeNull();
    expect(screen.getByLabelText('Filter company')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Lihat' })).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'Hapus' })[0].hasAttribute('disabled')).toBe(true);
  });

  it('keeps kataloka_admin selected with the Kataloka Administrator label when editing the user', async () => {
    const user = userEvent.setup();
    roles.list.mockResolvedValue({ data: [{ slug: 'kataloka_admin', name: 'Administrator', isActive: true }, { slug: 'admin', name: 'Administrator', isActive: true }] });
    users.list.mockResolvedValue({ data: [{ ...me, roleSlug: 'kataloka_admin' }] });
    renderSettings('kataloka_admin');

    const userRow = (await screen.findByText('admin@example.test')).closest('tr')!;
    await user.click(within(userRow).getByRole('button', { name: 'Ubah' }));

    const roleSelect = within(userRow.nextElementSibling as HTMLTableRowElement).getByLabelText('Role') as HTMLButtonElement;
    expect(roleSelect.getAttribute('value')).toBe('kataloka_admin');
    await user.click(roleSelect);
    expect(screen.getByRole('option', { name: 'Kataloka Administrator' }).getAttribute('data-value')).toBe('kataloka_admin');
    expect(screen.getByRole('option', { name: 'Administrator' }).getAttribute('data-value')).toBe('admin');
    await user.keyboard('{Escape}');
  });

  it('keeps self-delete disabled with an accessible hover and focus tooltip', async () => {
    users.list.mockResolvedValue({ data: [{ ...me, roleSlug: 'kataloka_admin' }] });
    renderSettings('kataloka_admin');
    const currentUserRow = (await screen.findByText('admin@example.test')).closest('tr');
    expect(Array.from(currentUserRow?.querySelectorAll('button') ?? []).some((button) => button.textContent?.includes('Ubah'))).toBe(true);
    const deleteButton = Array.from(currentUserRow?.querySelectorAll('button') ?? []).find((button) => button.textContent?.includes('Hapus'));
    expect(deleteButton?.hasAttribute('disabled')).toBe(true);
    const tooltip = screen.getByRole('tooltip', { name: 'Akun Anda tidak dapat dihapus.' });
    expect(tooltip.parentElement?.getAttribute('tabindex')).toBe('0');
    expect(tooltip.className).toContain('group-hover:opacity-100');
    expect(tooltip.className).toContain('group-focus:opacity-100');
    expect(users.remove).not.toHaveBeenCalled();
  });

  it('protects only the kataloka_admin role slug and keeps administrator deletable', async () => {
    roles.list.mockResolvedValue({ data: [{ slug: 'kataloka_admin', name: 'Kataloka Admin' }, { slug: 'administrator', name: 'Administrator' }] });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Role' });
    const protectedRole = screen.getByText('Kataloka Admin').closest('li');
    const administratorRole = screen.getAllByText('Administrator').find((element) => element.closest('li'))?.closest('li');
    const protectedDelete = Array.from(protectedRole?.querySelectorAll('button') ?? []).find((button) => button.textContent?.includes('Hapus'));
    const administratorDelete = Array.from(administratorRole?.querySelectorAll('button') ?? []).find((button) => button.textContent?.includes('Hapus'));
    expect(protectedDelete?.hasAttribute('disabled')).toBe(true);
    expect(administratorDelete?.hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('tooltip', { name: 'Role platform Kataloka Admin tidak dapat dihapus.' })).not.toBeNull();
  });

  it('archives roles with inactive-user references, refreshes the list, and excludes them from assignment', async () => {
    const user = userEvent.setup();
    roles.list.mockResolvedValue({ data: [{ slug: 'qa', name: 'QA', isActive: true }, { slug: 'legacy', name: 'Legacy', isActive: false }] });
    roles.remove.mockResolvedValue({ code: 'ROLES_ARCHIVE_SUCCESS', data: { slug: 'legacy', isActive: false, archived: true } });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Role' });
    expect(screen.getByText('Nonaktif')).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'Legacy' })).toBeNull();
    const legacyRole = screen.getByText('Legacy').closest('li');
    await user.click(Array.from(legacyRole?.querySelectorAll('button') ?? []).find((button) => button.textContent?.includes('Hapus'))!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(roles.remove).toHaveBeenCalledWith('legacy'));
    expect((await screen.findByRole('alert')).textContent).toContain('Role diarsipkan karena masih memiliki referensi pengguna nonaktif.');
    expect(roles.list).toHaveBeenCalledTimes(2);
  });

  it('reports physical role deletion when the lifecycle response confirms it', async () => {
    const user = userEvent.setup();
    roles.list.mockResolvedValue({ data: [{ slug: 'temporary', name: 'Temporary', isActive: true }] });
    roles.remove.mockResolvedValue({ code: 'ROLES_DELETE_SUCCESS', data: null });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Role' });
    const temporaryRole = screen.getAllByText('Temporary').find((element) => element.closest('li'))?.closest('li');
    await user.click(Array.from(temporaryRole?.querySelectorAll('button') ?? []).find((button) => button.textContent?.includes('Hapus'))!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(roles.remove).toHaveBeenCalledWith('temporary'));
    expect((await screen.findByRole('alert')).textContent).toContain('Role dihapus.');
    expect(roles.list).toHaveBeenCalledTimes(2);
  });

  it('validates role slugs locally and normalizes a valid KA create payload', async () => {
    const user = userEvent.setup();
    roles.create.mockResolvedValue({ code: 'ROLES_CREATE_SUCCESS', data: { slug: 'qa-team', name: 'QA Team', description: 'Quality', isActive: true } });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Role' });
    expect(screen.getByLabelText('Slug').getAttribute('minlength')).toBe('2');
    expect(screen.getByLabelText('Slug').getAttribute('maxlength')).toBe('50');
    const slugHelp = screen.getByRole('tooltip', { name: '2-50 karakter: huruf kecil, angka, atau tanda hubung.' });
    expect(slugHelp.parentElement?.getAttribute('aria-describedby')).toBe('role-slug-help');
    expect(slugHelp.parentElement?.getAttribute('tabindex')).toBe('0');
    expect(slugHelp.className).toContain('group-hover:opacity-100');
    expect(slugHelp.className).toContain('group-focus:opacity-100');
    await user.type(screen.getByLabelText('Slug'), 'x');
    await user.type(screen.getByLabelText('Nama'), 'Too short');
    await user.click(screen.getByRole('button', { name: 'Tambah role' }));
    expect(screen.getByRole('alert').textContent).toContain('Slug role harus 2-50 karakter');
    expect(roles.create).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), ' QA-TEAM ');
    await user.clear(screen.getByLabelText('Nama'));
    await user.type(screen.getByLabelText('Nama'), ' QA Team ');
    await user.type(screen.getByLabelText('Deskripsi'), ' Quality ');
    await user.click(screen.getByRole('button', { name: 'Tambah role' }));
    await waitFor(() => expect(roles.create).toHaveBeenCalledWith({ slug: 'qa-team', name: 'QA Team', description: 'Quality' }));
  });

  it('creates a company with the agreed required business fields', async () => {
    const user = userEvent.setup();
    companies.createManaged.mockResolvedValue({ data: company });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Company Management' });
    await user.type(screen.getAllByLabelText(/Company name/)[1], 'New Co');
    await user.type(screen.getByLabelText(/Address/), 'Bandung');
    await user.type(screen.getByLabelText(/Phone/), '0813');
    await user.type(screen.getByLabelText(/Business field/), 'Retail');
    await user.type(screen.getByLabelText(/Postal code/), '40100');
    await selectCustomOption(user, 'Business type (wajib)', '1');
    await selectCustomOption(user, 'Category (wajib)', '1');
    await user.click(screen.getByRole('button', { name: 'Buat company' }));
    await waitFor(() => expect(companies.createManaged).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Co', businessType: 1, category: 1, address: 'Bandung', phone: '0813', field: 'Retail', postalCode: '40100' })));
  });

  it('marks exactly the database-required company fields and explains the marker', async () => {
    renderSettings('kataloka_admin');
    const section = (await screen.findByRole('heading', { name: 'Company Management' })).closest('section')!;

    const form = section.querySelector('form')!;
    expect(within(section).getByText(/Field yang ditandai/).textContent).toContain('wajib diisi');
    expect(form.querySelectorAll('[required]').length).toBe(7);
    expect(form.querySelectorAll('[data-required-marker]').length).toBe(7);
    for (const label of ['Company name', 'Address', 'Phone', 'Business field', 'Postal code', 'Business type', 'Category']) {
      expect(within(section).getByLabelText(new RegExp(label)).getAttribute('required')).toBe('');
    }
    expect(within(section).getByLabelText('Email (opsional)').getAttribute('required')).toBeNull();
  });

  it('shows the agreed duplicate company phone message', async () => {
    const user = userEvent.setup();
    companies.createManaged.mockRejectedValue({ status: 409, message: 'Nomor telepon perusahaan sudah digunakan.' });
    renderSettings('kataloka_admin');
    const section = (await screen.findByRole('heading', { name: 'Company Management' })).closest('section')!;
    await user.type(within(section).getByLabelText(/Company name/), 'New Co');
    await user.type(within(section).getByLabelText(/Address/), 'Bandung');
    await user.type(within(section).getByLabelText(/Phone/), '0813');
    await user.type(within(section).getByLabelText(/Business field/), 'Retail');
    await user.type(within(section).getByLabelText(/Postal code/), '40100');
    await selectCustomOption(user, 'Business type (wajib)', '1');
    await selectCustomOption(user, 'Category (wajib)', '1');
    await user.click(within(section).getByRole('button', { name: 'Buat company' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Nomor telepon perusahaan sudah digunakan.');
  });

  it('places selected company details directly after Company controls', async () => {
    const user = userEvent.setup();
    renderSettings('kataloka_admin');
    await user.click(await screen.findByRole('button', { name: 'Lihat' }));
    const controls = screen.getByRole('heading', { name: 'Company controls' });
    const details = await screen.findByRole('heading', { name: 'Selected company details' });
    expect(controls.closest('section')?.nextElementSibling?.textContent).toContain(details.textContent);
  });

  it('edits a KA type with explicit controlled values and status', async () => {
    const user = userEvent.setup();
    companies.updateType.mockResolvedValue({ data: { id: 1 } });
    renderSettings('kataloka_admin');
    await user.click((await screen.findAllByRole('button', { name: 'Ubah' }))[0]);
    await user.clear(screen.getByLabelText('Business type name'));
    await user.type(screen.getByLabelText('Business type name'), 'PT Baru');
    await user.click(screen.getByLabelText('Business type active'));
    await user.click(screen.getByRole('button', { name: 'Simpan type' }));
    await waitFor(() => expect(companies.updateType).toHaveBeenCalledWith(1, { businessType: 'PT Baru', description: null, legalEntity: false, isActive: false }));
  });

  it('preserves the stable category code and explicit status when editing a KA category', async () => {
    const user = userEvent.setup();
    companies.updateCategory.mockResolvedValue({ data: { id: 1 } });
    renderSettings('kataloka_admin');
    await user.click((await screen.findAllByRole('button', { name: 'Ubah' }))[1]);
    await user.clear(screen.getByLabelText('Category name'));
    await user.type(screen.getByLabelText('Category name'), 'Micro Updated');
    await user.click(screen.getByLabelText('Category active'));
    await user.click(screen.getByRole('button', { name: 'Simpan category' }));
    await waitFor(() => expect(companies.updateCategory).toHaveBeenCalledWith(1, { code: 'MICRO', name: 'Micro Updated', description: '', isActive: false }));
  });

  it('renders normalized status and exposes only active catalog records for a new company', async () => {
    companies.listTypes.mockResolvedValue({ data: [{ id: 1, businessType: 'PT', isActive: true }, { id: 2, businessType: 'CV', isActive: false }] });
    companies.listCategories.mockResolvedValue({ data: [{ id: 1, code: 'MICRO', name: 'Micro', isActive: true }, { id: 2, code: 'OLD', name: 'Legacy', isActive: false }] });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Business Type and Category' });
    expect(screen.getByText('PT · Aktif')).not.toBeNull();
    expect(screen.getByText('CV · Nonaktif')).not.toBeNull();
    expect(screen.getByText('Legacy · Nonaktif')).not.toBeNull();
    expect(screen.getByText('PT · Aktif')).not.toBeNull();
    expect(screen.getByLabelText('Business type name').getAttribute('placeholder')).toBe('Contoh: Perseroan Terbatas');
    expect(screen.getByLabelText('Category code').getAttribute('placeholder')).toBe('Contoh: TECHNOLOGY');
  });

  it('keeps a selected inactive master record visible in company business details', async () => {
    companies.getDetails.mockResolvedValue({ data: { ...company, businessType: 2, category: 2, address: 'Jakarta', phone: '0812', email: null, field: 'Tech', postalCode: '12345', isActive: true } });
    companies.listTypes.mockResolvedValue({ data: [{ id: 1, businessType: 'PT', isActive: true }, { id: 2, businessType: 'CV', isActive: false }] });
    companies.listCategories.mockResolvedValue({ data: [{ id: 1, code: 'MICRO', name: 'Micro', isActive: true }, { id: 2, code: 'OLD', name: 'Legacy', isActive: false }] });
    renderSettings('admin');
    await screen.findByRole('heading', { name: 'Business details' });
    expect(screen.getByLabelText('Business type').textContent).toContain('CV (Nonaktif)');
    expect(screen.getByLabelText('Category').textContent).toContain('Legacy (Nonaktif)');
  });

  it('enables deletion only for archived companies and surfaces a linked-user conflict', async () => {
    const user = userEvent.setup();
    companies.listManaged.mockResolvedValue({ data: [{ ...company, isActive: false }] });
    companies.deleteManaged.mockRejectedValue({ message: 'Company masih memiliki user terkait.' });
    renderSettings('kataloka_admin');
    await screen.findByRole('heading', { name: 'Company controls' });
    const deleteButton = screen.getAllByRole('button', { name: 'Hapus' })[0];
    expect(deleteButton.hasAttribute('disabled')).toBe(false);
    await user.click(deleteButton);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Company masih memiliki user terkait');
  });

  it('renders an explicit safe state when the authenticated user has no company', async () => {
    companies.getProfile.mockRejectedValue({ message: 'Company belum ditetapkan.' });
    renderSettings('qa');
    expect(await screen.findByRole('status')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Company Profile tidak tersedia');
  });
});
