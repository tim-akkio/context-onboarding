import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import Interview from "./Interview.jsx";
import InvitationLanding from "./InvitationLanding.jsx";
import AdminLogin from "./admin/AdminLogin.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

function RequireInterviewee({ children }) {
  const { isInterviewee } = useAuth();
  if (!isInterviewee) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { isAdmin, isInterviewee } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isInterviewee) return <Navigate to="/interview" replace />;
  return <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/i/:token" element={<InvitationLanding />} />
          <Route path="/interview" element={<RequireInterviewee><Interview /></RequireInterviewee>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
