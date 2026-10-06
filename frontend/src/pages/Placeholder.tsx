import { Card, Result } from 'antd';
import { useLocation } from 'react-router-dom';

/** 按「UI 原型先行」流程：该模块的高保真原型已在 prototype/ 落地，
 *  真实页面的开发需按 openspec 提案逐个进入。 */
export default function Placeholder() {
  const loc = useLocation();
  return (
    <Card>
      <Result
        status="info"
        title={`模块 ${loc.pathname} 尚未进入真实开发`}
        subTitle={<>该功能的交互形态已在高保真原型（prototype/）中定义并通过产品确认；将按 openspec 提案逐步实现真实页面。</>}
      />
    </Card>
  );
}
