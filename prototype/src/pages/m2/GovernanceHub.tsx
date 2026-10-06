import TabHub from '../../components/TabHub';
import T0 from './Convergence';
import T1 from './Synonym';
import T2 from './Crosslink';
export default function GovernanceHub() {
  return <TabHub items={[{ key: 'convergence', label: '隐式本体收敛', el: <T0 /> }, { key: 'synonym', label: '同义词归并', el: <T1 /> }, { key: 'crosslink', label: '跨源融合', el: <T2 /> }]} />;
}
