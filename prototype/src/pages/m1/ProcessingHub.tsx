import TabHub from '../../components/TabHub';
import T0 from './Pipeline';
import T1 from './ParseProfile';
export default function ProcessingHub() {
  return <TabHub items={[{ key: 'pipeline', label: '管道编排', el: <T0 /> }, { key: 'parse', label: '解析策略', el: <T1 /> }]} />;
}
