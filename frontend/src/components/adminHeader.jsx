import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { removeToken } from '../utils/auth';

export default function AdminHeader({ page, userData }) {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  const isActive = (name) => page === name;

  const navItems = [
    { key: "./admin", label: "Dashboard", icon: "dashboard" },
    { key: "./admin/users", label: "Users", icon: "person" },
    { key: "./admin/projects", label: "Projects", icon: "assignment" },
    { key: "./admin/alerts", label: "Alerts", icon: "notifications" },
    { key: "./logout", label: "Log Out", icon: "logout" },
  ];

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  return (
    <>
      {/* HEADER */}
      <header className="w-full sticky top-0 z-40 bg-surface dark:bg-surface-dim shadow-sm flex justify-between items-center px-6 py-md md:px-margin-desktop">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <span className="text-display-lg-mobile text-primary dark:text-primary-fixed-dim font-bold">
            TaskFlow
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.key === "./logout" ? "#" : `/${item.key}`}
              onClick={item.key === "./logout" ? handleLogout : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-full relative ${
                isActive(item.key)
                  ? "text-primary bg-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Profile */}
        <div className="flex items-center gap-4 relative">
          
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-on-surface">{userData?.username || 'Admin'}</span>
            <span className="text-xs text-on-surface-variant">#{userData?.id || 'N/A'}</span>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
            {userData?.userImage ? (
              <img
                className="w-full h-full object-cover"
                src={userData.userImage}
                alt={userData.username}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://ui-avatars.com/api/?name=' + (userData?.username || 'Admin') + '&background=6366f1&color=fff&size=40';
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                {userData?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface dark:bg-surface-dim border-t border-surface-container-high flex justify-around items-center py-2">
        {navItems.map((item) => (
          <Link
            key={item.key}
            to={item.key === "./logout" ? "#" : `/${item.key}`}
            onClick={item.key === "./logout" ? handleLogout : undefined}
            className={`flex flex-col items-center relative ${
              isActive(item.key) ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
            {item.key === "./admin/alerts" && alertCount > 0 && (
              <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}