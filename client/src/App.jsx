import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Toast from './components/common/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import EventDetailsPage from './pages/EventDetailsPage';
import GalleryPage from './pages/GalleryPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// AppLayout wraps every page with Navbar + Footer + Toast overlay
const AppLayout = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard');

  return (
    <div className="min-h-screen flex flex-col">
      {!isDashboard && <Navbar />}
      <main className="flex-grow flex flex-col">{children}</main>
      {!isDashboard && <Footer />}
      <Toast />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Public routes ── */}
            <Route path="/"          element={<AppLayout><LandingPage /></AppLayout>} />
            <Route path="/login"     element={<AppLayout><LoginPage /></AppLayout>} />
            <Route path="/register"  element={<AppLayout><RegisterPage /></AppLayout>} />
            <Route path="/events/:id" element={<AppLayout><EventDetailsPage /></AppLayout>} />
            <Route path="/gallery"   element={<AppLayout><GalleryPage /></AppLayout>} />
            <Route path="/contact"   element={<AppLayout><ContactPage /></AppLayout>} />
            <Route path="/unauthorized" element={<AppLayout><UnauthorizedPage /></AppLayout>} />

            {/* ── Protected: Student ── */}
            <Route
              path="/student/dashboard"
              element={
                <AppLayout>
                  <ProtectedRoute role="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                </AppLayout>
              }
            />

            {/* ── Protected: Teacher ── */}
            <Route
              path="/teacher/dashboard"
              element={
                <AppLayout>
                  <ProtectedRoute role="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                </AppLayout>
              }
            />

            {/* ── Protected: HOD ── */}
            <Route
              path="/hod/dashboard"
              element={
                <AppLayout>
                  <ProtectedRoute role="hod">
                    <HODDashboard />
                  </ProtectedRoute>
                </AppLayout>
              }
            />

            {/* ── 404 ── */}
            <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />

          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
