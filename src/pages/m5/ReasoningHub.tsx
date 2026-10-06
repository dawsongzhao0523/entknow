import TabHub from '../../components/TabHub';
import T0 from './SemanticQuery';
import T1 from './RuleReasoning';
import T2 from './OwlReasoner';
export default function ReasoningHub() {
  return <TabHub items={[{ key: 'query', label: '语义查询', el: <T0 /> }, { key: 'rule', label: '规则推理', el: <T1 /> }, { key: 'owl', label: 'OWL 推理机', el: <T2 /> }]} />;
}
