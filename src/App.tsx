import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CompleteData from "./pages/CompleteData";

const App = () => {


    return (
        <Routes>
            {/* Redirect root */}
            <Route path="/" element={<Navigate to="/landing" replace />} />

            {/* Landing Page */}
            <Route path="/landing" element={<LandingPage />} />

            {/* Onboarding */}
            <Route
                path="/onboarding/complete-data"
                element={<CompleteData />}
            />

            {/* Fallback */}
            <Route
                path="*"
                element={<Navigate to="/landing" replace />}
            />
        </Routes>
    );
};

export default App;
