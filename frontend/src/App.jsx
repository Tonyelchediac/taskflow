import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from './utils/auth';
import Login from './Login';
import User from './userFolder/User';
import Projects from './userFolder/Projects';
import UserAlerts from './userFolder/Alerts';
import Admin from './adminFolder/Admin';
import AdminUsers from './adminFolder/AdminUser';
import AdminProjects from './adminFolder/Projects';
import AdminAlerts from './adminFolder/Alerts';

/** Redirects to /login if not authenticated, or to correct role route if unauthorized */
function ProtectedRoute({ children, allowedRoles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (allowedRoles && (!user || !allowedRoles.includes(user.status))) {
    // Role mismatch: redirect to the correct home based on role
    if (user && user.status === 'ad') {
      return <Navigate to="/admin" replace />;
    } else if (user && user.status === 'ur') {
      return <Navigate to="/user" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* Default route - redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Login Page */}
          <Route path="/login" element={<Login />} />

          {/* User Routes */}
          <Route path="/user" element={<ProtectedRoute allowedRoles={['ur']}><User /></ProtectedRoute>} />
          <Route path="/user/projects" element={<ProtectedRoute allowedRoles={['ur']}><Projects /></ProtectedRoute>} />
          <Route path="/user/alerts" element={<ProtectedRoute allowedRoles={['ur']}><UserAlerts /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ad']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ad']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/projects" element={<ProtectedRoute allowedRoles={['ad']}><AdminProjects /></ProtectedRoute>} />
          <Route path="/admin/alerts" element={<ProtectedRoute allowedRoles={['ad']}><AdminAlerts /></ProtectedRoute>} />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;