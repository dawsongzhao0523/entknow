import TabHub from '../../components/TabHub';
import T0 from './Versions';
import T1 from './Owl';
export default function VersionHub() {
  return <TabHub items={[{ key: 'versions', label: '本体与版本', el: <T0 /> }, { key: 'owl', label: '标准互操作', el: <T1 /> }]} />;
}
