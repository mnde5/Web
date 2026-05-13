import { useEffect, useState } from 'react';
import { getCurrentUser, syncRole } from '../utils/role';

export default function useTeam2User() {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    let mounted = true;
    syncRole().finally(() => { if (mounted) setUser(getCurrentUser()); });

    const onChange = (e) => setUser(e.detail || getCurrentUser());
    window.addEventListener('team2-user-change', onChange);
    return () => {
      mounted = false;
      window.removeEventListener('team2-user-change', onChange);
    };
  }, []);

  return user;
}
