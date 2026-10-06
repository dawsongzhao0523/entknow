import TabHub from '../../components/TabHub';
import T0 from './Branches';
import T1 from './Retraction';
import T2 from './Evolution';
export default function EvolutionHub() {
  return <TabHub items={[{ key: 'branches', label: '分支与隔离', el: <T0 /> }, { key: 'retraction', label: '撤回与对账', el: <T1 /> }, { key: 'evolution', label: '自进化闭环', el: <T2 /> }]} />;
}
