import { useEffect, useState } from 'react';
import { getRole, syncRole } from '../utils/role';

export default function useTeam2Role() {
  const [role, setRoleState] = useState(getRole());

  useEffect(() => {
    let mounted = true;
    syncRole().then(r => { if (mounted && r) setRoleState(r); });

    const onChange = (e) => setRoleState(e.detail || getRole());
    const onStorage = (e) => {
      if (e.key === 'team2_user') setRoleState(getRole());
    };
    window.addEventListener('team2-role-change', onChange);
    window.addEventListener('team2-user-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      mounted = false;
      window.removeEventListener('team2-role-change', onChange);
      window.removeEventListener('team2-user-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return role;
}
