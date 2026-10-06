import TabHub from '../../components/TabHub';
import T0 from './Monitor';
import T1 from './Logs';
export default function OpsHub() {
  return <TabHub items={[{ key: 'monitor', label: '服务监控', el: <T0 /> }, { key: 'logs', label: '日志查询', el: <T1 /> }]} />;
}
