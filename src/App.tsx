import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/src/pages/LoginPage.tsx';
import ProjectsTestCasesPage from '@/src/pages/ProjectsTestCasesPage.tsx';


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/workspace" element={<ProjectsTestCasesPage />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
