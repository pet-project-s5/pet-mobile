import { getIsAdm, getUserId, getUserName } from '../services/auth';

export function resolveSessionParams(routeParams = {}) {
  const userId = routeParams?.userId ?? routeParams?.ownerId ?? getUserId() ?? null;
  const userName = routeParams?.userName ?? getUserName() ?? '';
  const isAdm = typeof routeParams?.isAdm === 'boolean' ? routeParams.isAdm : Boolean(getIsAdm());

  return {
    userId,
    ownerId: routeParams?.ownerId ?? routeParams?.userId ?? getUserId() ?? null,
    userName,
    isAdm,
  };
}