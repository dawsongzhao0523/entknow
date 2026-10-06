import TabHub from '../../components/TabHub';
import T0 from './DatasourceList';
import T1 from './SyncPolicy';
import T2 from './ProfileReport';
import T3 from './DocSource';
export default function SourceHub() {
  return <TabHub items={[{ key: 'list', label: '数据源注册', el: <T0 /> }, { key: 'policy', label: '更新策略', el: <T1 /> }, { key: 'profile', label: '元数据探查', el: <T2 /> }, { key: 'doc', label: '非结构化数据源', el: <T3 /> }]} />;
}
