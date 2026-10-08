import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';

import SourceHub from './pages/assets/SourceHub';
import Explorer from './pages/assets/Explorer';
import ProcessingHub from './pages/assets/ProcessingHub';
import Market from './pages/assets/Market';
import Workbench from './pages/assets/Workbench';
import LogicalView from './pages/assets/LogicalView';

import KnowledgeTree from './pages/knowledge/KnowledgeTree';
import GovernanceHub from './pages/knowledge/GovernanceHub';

import Ontology, { OntologyDetail } from './pages/modeling/Ontology';
import DesignerHub from './pages/modeling/DesignerHub';
import ModelingHub from './pages/modeling/ModelingHub';
import VersionHub from './pages/modeling/VersionHub';

import Binding from './pages/runtime/Binding';
import Instance360 from './pages/runtime/Instance360';
import RuntimeHub from './pages/runtime/RuntimeHub';

import ReasoningHub from './pages/reasoning/ReasoningHub';

import Sandbox from './pages/sandbox/Sandbox';

import CapabilityHub from './pages/apps/CapabilityHub';

import ReleaseHub from './pages/governance/ReleaseHub';
import EvolutionHub from './pages/governance/EvolutionHub';

import Overview from './pages/admin/Overview';
import OrgHub from './pages/admin/OrgHub';
import OpsHub from './pages/admin/OpsHub';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="overview" element={<Navigate to="/admin/overview" replace />} />
          {/* 新菜单路由 */}
          <Route path="assets/explorer" element={<Explorer />} />
          <Route path="assets/sources" element={<SourceHub />} />
          <Route path="assets/market" element={<Market />} />
          <Route path="assets/workbench" element={<Workbench />} />
          <Route path="assets/processing" element={<ProcessingHub />} />
          <Route path="assets/logical-view" element={<LogicalView />} />
          <Route path="knowledge/workbench" element={<Navigate to="/knowledge/tree" replace />} />
          <Route path="knowledge/tree" element={<KnowledgeTree />} />
          <Route path="knowledge/governance" element={<GovernanceHub />} />
          <Route path="modeling/ontology" element={<Ontology />} />
          <Route path="modeling/ontology/detail" element={<OntologyDetail />} />
          <Route path="modeling/designer" element={<DesignerHub />} />
          <Route path="modeling/ai-modeling" element={<ModelingHub />} />
          <Route path="modeling/version-ops" element={<VersionHub />} />
          <Route path="runtime/binding" element={<Binding />} />
          <Route path="runtime/instance-360" element={<Instance360 />} />
          <Route path="runtime/rules" element={<RuntimeHub />} />
          <Route path="reasoning/workbench" element={<ReasoningHub />} />
          <Route path="sandbox/compare" element={<Sandbox />} />
          <Route path="apps/capabilities" element={<CapabilityHub />} />
          <Route path="governance/release" element={<ReleaseHub />} />
          <Route path="governance/evolution" element={<EvolutionHub />} />
          <Route path="admin/overview" element={<Overview />} />
          <Route path="admin/org" element={<OrgHub />} />
          <Route path="admin/ops" element={<OpsHub />} />
          <Route path="admin/settings" element={<Settings />} />
          {/* 旧路径 → 新路径 redirect，保证页面内跳转不断链 */}
          <Route path="assets/datasource-list" element={<Navigate to="/assets/sources?tab=list" replace />} />
          <Route path="assets/sync-policy" element={<Navigate to="/assets/sources?tab=policy" replace />} />
          <Route path="assets/profile-report" element={<Navigate to="/assets/sources?tab=profile" replace />} />
          <Route path="assets/doc-source" element={<Navigate to="/assets/sources?tab=doc" replace />} />
          <Route path="assets/pipeline" element={<Navigate to="/assets/processing?tab=pipeline" replace />} />
          <Route path="assets/parse-profile" element={<Navigate to="/assets/processing?tab=parse" replace />} />
          <Route path="knowledge/convergence" element={<Navigate to="/knowledge/governance?tab=convergence" replace />} />
          <Route path="knowledge/synonym" element={<Navigate to="/knowledge/governance?tab=synonym" replace />} />
          <Route path="knowledge/crosslink" element={<Navigate to="/knowledge/governance?tab=crosslink" replace />} />
          <Route path="modeling/ai-session" element={<Navigate to="/modeling/designer" replace />} />
          <Route path="modeling/registry" element={<Navigate to="/modeling/ontology/detail?onto=scm&sec=objects" replace />} />
          <Route path="modeling/learning" element={<Navigate to="/modeling/ai-modeling?tab=learning" replace />} />
          <Route path="modeling/wizard" element={<Navigate to="/modeling/ai-modeling?tab=wizard" replace />} />
          <Route path="modeling/versions" element={<Navigate to="/modeling/ontology/detail?onto=scm&sec=versions" replace />} />
          <Route path="modeling/owl" element={<Navigate to="/modeling/version-ops?tab=owl" replace />} />
          <Route path="modeling/edge-editor" element={<Navigate to="/modeling/designer?tab=edge" replace />} />
          <Route path="runtime/propagation" element={<Navigate to="/runtime/rules?tab=propagation" replace />} />
          <Route path="runtime/action-gateway" element={<Navigate to="/runtime/rules?tab=action" replace />} />
          <Route path="reasoning/semantic-query" element={<Navigate to="/reasoning/workbench?tab=query" replace />} />
          <Route path="reasoning/rule-reasoning" element={<Navigate to="/reasoning/workbench?tab=rule" replace />} />
          <Route path="reasoning/owl-reasoner" element={<Navigate to="/reasoning/workbench?tab=owl" replace />} />
          <Route path="apps/capabilities-catalog" element={<Navigate to="/apps/capabilities?tab=catalog" replace />} />
          <Route path="apps/cli" element={<Navigate to="/apps/capabilities?tab=cli" replace />} />
          <Route path="governance/review" element={<Navigate to="/governance/release?tab=review" replace />} />
          <Route path="governance/release-gate" element={<Navigate to="/governance/release?tab=gate" replace />} />
          <Route path="governance/branches" element={<Navigate to="/governance/evolution?tab=branches" replace />} />
          <Route path="governance/retraction" element={<Navigate to="/governance/evolution?tab=retraction" replace />} />
          <Route path="admin/users" element={<Navigate to="/admin/org?tab=users" replace />} />
          <Route path="admin/roles" element={<Navigate to="/admin/org?tab=roles" replace />} />
          <Route path="admin/menus" element={<Navigate to="/admin/org?tab=menus" replace />} />
          <Route path="admin/permissions" element={<Navigate to="/admin/org?tab=permissions" replace />} />
          <Route path="admin/monitor" element={<Navigate to="/admin/ops?tab=monitor" replace />} />
          <Route path="admin/logs" element={<Navigate to="/admin/ops?tab=logs" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
