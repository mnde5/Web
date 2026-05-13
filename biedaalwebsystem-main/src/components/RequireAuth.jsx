import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getCurrentUser, syncRole } from '../utils/role';
import { AUTH_CHANGE_EVENT, USER_CHANGE_EVENT, hasActiveSession } from '../utils/session';

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-gray-400">
      Сешн шалгаж байна...
    </div>
  );
}

export default function RequireAuth() {
  const location = useLocation();
  const [ready, setReady] = useState(!hasActiveSession());
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    let mounted = true;

    const ensureSession = async () => {
      if (!hasActiveSession()) {
        if (mounted) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      if (mounted) setReady(false);
      await syncRole();
      if (mounted) {
        setUser(getCurrentUser());
        setReady(true);
      }
    };

    ensureSession();

    const onSessionChange = () => {
      setUser(getCurrentUser());
      setReady(true);
    };

    window.addEventListener(AUTH_CHANGE_EVENT, onSessionChange);
    window.addEventListener(USER_CHANGE_EVENT, onSessionChange);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGE_EVENT, onSessionChange);
      window.removeEventListener(USER_CHANGE_EVENT, onSessionChange);
    };
  }, []);

  if (!hasActiveSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!ready) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  return <Outlet />;
}
