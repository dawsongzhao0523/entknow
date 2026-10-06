import TabHub from '../../components/TabHub';
import T0 from './Review';
import T1 from './ReleaseGate';
export default function ReleaseHub() {
  return <TabHub items={[{ key: 'review', label: '治理评审台', el: <T0 /> }, { key: 'gate', label: '发布门禁', el: <T1 /> }]} />;
}
