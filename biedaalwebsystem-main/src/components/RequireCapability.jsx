import AccessDenied from './AccessDenied';
import useTeam2Role from '../hooks/useTeam2Role';
import useTeam2User from '../hooks/useTeam2User';

export default function RequireCapability({ check, children, title, message }) {
  const role = useTeam2Role();
  const user = useTeam2User();

  if (!check({ role, user })) {
    return <AccessDenied title={title} message={message} />;
  }

  return children;
}
