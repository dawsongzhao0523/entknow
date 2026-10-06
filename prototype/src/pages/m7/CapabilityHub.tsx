import TabHub from '../../components/TabHub';
import T0 from './CapabilityCatalog';
import T1 from './Cli';
export default function CapabilityHub() {
  return <TabHub items={[{ key: 'catalog', label: '能力目录', el: <T0 /> }, { key: 'cli', label: 'CLI 出口', el: <T1 /> }]} />;
}
