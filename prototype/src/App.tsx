import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';

import M1SourceHub from './pages/m1/SourceHub';
import M1ProcessingHub from './pages/m1/ProcessingHub';
import M1Market from './pages/m1/Market';
import M1Workbench from './pages/m1/Workbench';
import M1LogicalView from './pages/m1/LogicalView';

import M2KnowledgeTree from './pages/m2/KnowledgeTree';
import M2GovernanceHub from './pages/m2/GovernanceHub';

import M3Ontology, { OntologyDetail } from './pages/m3/Ontology';
import M3DesignerHub from './pages/m3/DesignerHub';
import M3ModelingHub from './pages/m3/ModelingHub';
import M3VersionHub from './pages/m3/VersionHub';

import M4Binding from './pages/m4/Binding';
import M4Instance360 from './pages/m4/Instance360';
import M4RuntimeHub from './pages/m4/RuntimeHub';

import M5ReasoningHub from './pages/m5/ReasoningHub';

import M6Sandbox from './pages/m6/Sandbox';

import M7CapabilityHub from './pages/m7/CapabilityHub';

import M8ReleaseHub from './pages/m8/ReleaseHub';
import M8EvolutionHub from './pages/m8/EvolutionHub';

import M9Overview from './pages/m9/Overview';
import M9OrgHub from './pages/m9/OrgHub';
import M9OpsHub from './pages/m9/OpsHub';
import M9Settings from './pages/m9/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="overview" element={<Navigate to="/m9/overview" replace />} />
          {/* 新菜单路由 */}
          <Route path="m1/sources" element={<M1SourceHub />} />
          <Route path="m1/market" element={<M1Market />} />
          <Route path="m1/workbench" element={<M1Workbench />} />
          <Route path="m1/processing" element={<M1ProcessingHub />} />
          <Route path="m1/logical-view" element={<M1LogicalView />} />
          <Route path="m2/workbench" element={<Navigate to="/m2/knowledge-tree" replace />} />
          <Route path="m2/knowledge-tree" element={<M2KnowledgeTree />} />
          <Route path="m2/governance" element={<M2GovernanceHub />} />
          <Route path="m3/ontology" element={<M3Ontology />} />
          <Route path="m3/ontology/detail" element={<OntologyDetail />} />
          <Route path="m3/designer" element={<M3DesignerHub />} />
          <Route path="m3/modeling" element={<M3ModelingHub />} />
          <Route path="m3/version-ops" element={<M3VersionHub />} />
          <Route path="m4/binding" element={<M4Binding />} />
          <Route path="m4/instance-360" element={<M4Instance360 />} />
          <Route path="m4/runtime" element={<M4RuntimeHub />} />
          <Route path="m5/reasoning" element={<M5ReasoningHub />} />
          <Route path="m6/sandbox" element={<M6Sandbox />} />
          <Route path="m7/capability" element={<M7CapabilityHub />} />
          <Route path="m8/release" element={<M8ReleaseHub />} />
          <Route path="m8/evolution" element={<M8EvolutionHub />} />
          <Route path="m9/overview" element={<M9Overview />} />
          <Route path="m9/org" element={<M9OrgHub />} />
          <Route path="m9/ops" element={<M9OpsHub />} />
          <Route path="m9/settings" element={<M9Settings />} />
          {/* 旧路径 → 新路径 redirect，保证页面内跳转不断链 */}
          <Route path="m1/datasource-list" element={<Navigate to="/m1/sources?tab=list" replace />} />
          <Route path="m1/sync-policy" element={<Navigate to="/m1/sources?tab=policy" replace />} />
          <Route path="m1/profile-report" element={<Navigate to="/m1/sources?tab=profile" replace />} />
          <Route path="m1/doc-source" element={<Navigate to="/m1/sources?tab=doc" replace />} />
          <Route path="m1/pipeline" element={<Navigate to="/m1/processing?tab=pipeline" replace />} />
          <Route path="m1/parse-profile" element={<Navigate to="/m1/processing?tab=parse" replace />} />
          <Route path="m2/convergence" element={<Navigate to="/m2/governance?tab=convergence" replace />} />
          <Route path="m2/synonym" element={<Navigate to="/m2/governance?tab=synonym" replace />} />
          <Route path="m2/crosslink" element={<Navigate to="/m2/governance?tab=crosslink" replace />} />
          <Route path="m3/ai-session" element={<Navigate to="/m3/designer" replace />} />
          <Route path="m3/registry" element={<Navigate to="/m3/ontology/detail?onto=scm&sec=objects" replace />} />
          <Route path="m3/learning" element={<Navigate to="/m3/modeling?tab=learning" replace />} />
          <Route path="m3/wizard" element={<Navigate to="/m3/modeling?tab=wizard" replace />} />
          <Route path="m3/versions" element={<Navigate to="/m3/ontology/detail?onto=scm&sec=versions" replace />} />
          <Route path="m3/owl" element={<Navigate to="/m3/version-ops?tab=owl" replace />} />
          <Route path="m3/edge-editor" element={<Navigate to="/m3/designer?tab=edge" replace />} />
          <Route path="m4/propagation" element={<Navigate to="/m4/runtime?tab=propagation" replace />} />
          <Route path="m4/action-gateway" element={<Navigate to="/m4/runtime?tab=action" replace />} />
          <Route path="m5/semantic-query" element={<Navigate to="/m5/reasoning?tab=query" replace />} />
          <Route path="m5/rule-reasoning" element={<Navigate to="/m5/reasoning?tab=rule" replace />} />
          <Route path="m5/owl-reasoner" element={<Navigate to="/m5/reasoning?tab=owl" replace />} />
          <Route path="m7/capability-catalog" element={<Navigate to="/m7/capability?tab=catalog" replace />} />
          <Route path="m7/cli" element={<Navigate to="/m7/capability?tab=cli" replace />} />
          <Route path="m8/review" element={<Navigate to="/m8/release?tab=review" replace />} />
          <Route path="m8/release-gate" element={<Navigate to="/m8/release?tab=gate" replace />} />
          <Route path="m8/branches" element={<Navigate to="/m8/evolution?tab=branches" replace />} />
          <Route path="m8/retraction" element={<Navigate to="/m8/evolution?tab=retraction" replace />} />
          <Route path="m9/users" element={<Navigate to="/m9/org?tab=users" replace />} />
          <Route path="m9/roles" element={<Navigate to="/m9/org?tab=roles" replace />} />
          <Route path="m9/menus" element={<Navigate to="/m9/org?tab=menus" replace />} />
          <Route path="m9/permissions" element={<Navigate to="/m9/org?tab=permissions" replace />} />
          <Route path="m9/monitor" element={<Navigate to="/m9/ops?tab=monitor" replace />} />
          <Route path="m9/logs" element={<Navigate to="/m9/ops?tab=logs" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
