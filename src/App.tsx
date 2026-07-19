import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import LoginPage from '@/src/pages/LoginPage.tsx';
import ProjectsTestCasesPage from '@/src/pages/ProjectsTestCasesPage.tsx';
import { AuthService } from '@/src/api/auth.service.ts';

const RequireSession = ({ children }: { children: ReactNode }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AuthService.getAuthSession()
      .then(() => {
        if (isMounted) setIsAuthenticated(true);
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

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-600">
        Memeriksa sesi…
      </main>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
