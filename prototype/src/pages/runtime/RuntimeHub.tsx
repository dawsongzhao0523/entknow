import TabHub from '../../components/TabHub';
import T0 from './Propagation';
import T1 from './ActionGateway';
export default function RuntimeHub() {
  return <TabHub items={[{ key: 'propagation', label: '传播引擎', el: <T0 /> }, { key: 'action', label: '行动类（Action）', el: <T1 /> }]} />;
}
