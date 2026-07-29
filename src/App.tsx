import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import LoginPage from '@/src/pages/LoginPage.tsx';
import ProjectsTestCasesPage from '@/src/pages/ProjectsTestCasesPage.tsx';
import { AuthService } from '@/src/api/auth.service.ts';
import { SessionContext } from '@/src/auth/SessionContext.tsx';
import type { CompanyRecord, UserRecord } from '@/src/types/api.ts';
import { CompanyIdentity } from '@/src/components/company/CompanyIdentity.tsx';

const RequireSession = ({ children }: { children: ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    AuthService.getAuthSession()
      .then((response) => {
        if (isMounted) {
          const sessionUser = response.data.user;
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            username: sessionUser.username ?? '',
            roleSlug: sessionUser.role,
            isActive: true,
            company: sessionUser.company,
          });
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthenticated(false);
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const updateCompany = (event: Event) => {
      const company = (event as CustomEvent<CompanyRecord>).detail;
      setUser((current) => current ? { ...current, company } : current);
    };
    window.addEventListener('company-profile-updated', updateCompany);
    return () => window.removeEventListener('company-profile-updated', updateCompany);
  }, []);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-600">
        Memeriksa sesi…
      </main>
    );
  }

  return isAuthenticated ? <SessionContext.Provider value={user}><CompanyIdentity company={user?.company} />{children}</SessionContext.Provider> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/workspace"
        element={
          <RequireSession>
            <ProjectsTestCasesPage />
          </RequireSession>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
