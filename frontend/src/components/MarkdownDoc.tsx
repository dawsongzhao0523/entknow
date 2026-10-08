import { Streamdown, defaultRemarkPlugins } from 'streamdown';
import { code } from '@streamdown/code';
import { mermaid } from '@streamdown/mermaid';
import { cjk } from '@streamdown/cjk';
import 'streamdown/styles.css';

/** 与 source/codenexus 同款 Markdown 渲染器：Shiki 高亮 + Mermaid + CJK 优化 */
export default function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <Streamdown
      mode="static"
      remarkPlugins={Object.values(defaultRemarkPlugins)}
      className="md-doc"
      plugins={{ code, mermaid, cjk }}
      shikiTheme={['github-light', 'github-light']}
      tableMaxHeight={0}
      codeBlockMaxHeight={0}
      mermaid={{ config: { theme: 'default', fontFamily: 'ui-monospace, monospace' } }}
    >
      {markdown}
    </Streamdown>
  );
}
