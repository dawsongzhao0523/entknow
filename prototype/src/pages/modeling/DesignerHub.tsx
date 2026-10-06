import TabHub from '../../components/TabHub';
import T0 from './Designer';
import T1 from './EdgeEditor';
export default function DesignerHub() {
  return <TabHub items={[{ key: 'canvas', label: '建模画布', el: <T0 /> }, { key: 'edge', label: '关系建模', el: <T1 /> }]} />;
}
