import TabHub from '../../components/TabHub';
import T0 from './Wizard';
import T1 from './Learning';
import T2 from './Extraction';
import T3 from './UtopiaIntegration';
// AI 协作建模能力已并入「本体设计器」右侧栏（AI 建模助手），此处保留向导与学习闭环
export default function ModelingHub() {
  return <TabHub items={[
    { key: 'extract', label: '语料提取', el: <T2 /> },
    { key: 'utopia', label: 'Utopia 集成', el: <T3 /> },
    { key: 'wizard', label: '七步法向导', el: <T0 /> },
    { key: 'learning', label: '本体学习辅助', el: <T1 /> },
  ]} />;
}
