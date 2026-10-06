import TabHub from '../../components/TabHub';
import T0 from './Users';
import T1 from './Roles';
import T2 from './Menus';
import T3 from './Permissions';
export default function OrgHub() {
  return <TabHub items={[{ key: 'users', label: '用户管理', el: <T0 /> }, { key: 'roles', label: '角色管理', el: <T1 /> }, { key: 'menus', label: '菜单管理', el: <T2 /> }, { key: 'permissions', label: '权限管理', el: <T3 /> }]} />;
}
