import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';
import Ontologies from './pages/Ontologies';
import Datasources from './pages/Datasources';
import Reviews from './pages/Reviews';
import KnowledgeBase from './pages/KnowledgeBase';
import Synonyms from './pages/Synonyms';
import Instance360 from './pages/Instance360';
import RuntimeRules from './pages/RuntimeRules';
import CapabilityOutlet from './pages/CapabilityOutlet';
import SemanticQuery from './pages/SemanticQuery';
import LogicalViews from './pages/LogicalViews';
import Pipelines from './pages/Pipelines';
import Sandbox from './pages/Sandbox';
import Placeholder from './pages/Placeholder';
import Market from './pages/assets/Market';
import Workbench from './pages/assets/Workbench';
import Convergence from './pages/knowledge/Convergence';
import OntologyDetail from './pages/modeling/OntologyDetail';
import Designer from './pages/modeling/Designer';
import AiModeling from './pages/modeling/AiModeling';
import Binding from './pages/runtime/Binding';
import ReasoningEngine from './pages/reasoning/Engine';
import Evolution from './pages/governance/Evolution';

import Overview from './pages/admin/Overview';
import OrgAdmin from './pages/OrgAdmin';
import Permissions from './pages/admin/Permissions';
import Menus from './pages/admin/Menus';
import Monitor from './pages/admin/Monitor';
import Logs from './pages/admin/Logs';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="home" element={<Home />} />
        <Route path="assets/datasources" element={<Datasources />} />
        <Route path="assets/views" element={<LogicalViews />} />
        <Route path="assets/pipelines" element={<Pipelines />} />
        <Route path="knowledge/entries" element={<KnowledgeBase />} />
        <Route path="knowledge/synonyms" element={<Synonyms />} />
        <Route path="modeling/ontologies" element={<Ontologies />} />
        <Route path="modeling/registry" element={<Navigate to="/modeling/ontology/detail?sec=objects" replace />} />
        <Route path="modeling/designer" element={<Designer />} />
        <Route path="runtime/instances" element={<Instance360 />} />
        <Route path="runtime/rules" element={<RuntimeRules />} />
        <Route path="governance/reviews" element={<Reviews />} />
        <Route path="apps/capabilities" element={<CapabilityOutlet />} />
        <Route path="reasoning/query" element={<SemanticQuery />} />
        <Route path="sandbox/compare" element={<Sandbox />} />
        <Route path="admin/overview" element={<Overview />} />
        <Route path="admin/org" element={<OrgAdmin />} />
        <Route path="admin/permissions" element={<Permissions />} />
        <Route path="admin/menus" element={<Menus />} />
        <Route path="admin/monitor" element={<Monitor />} />
        <Route path="admin/logs" element={<Logs />} />
        <Route path="admin/settings" element={<Settings />} />
        <Route path="assets/market" element={<Market />} />
        <Route path="assets/workbench" element={<Workbench />} />
        <Route path="knowledge/convergence" element={<Convergence />} />
        <Route path="modeling/ontology/detail" element={<OntologyDetail />} />
        <Route path="modeling/ai-modeling" element={<AiModeling />} />
        <Route path="modeling/version-ops" element={<Navigate to="/modeling/ontology/detail?sec=versions" replace />} />
        <Route path="runtime/binding" element={<Binding />} />
        <Route path="reasoning/engine" element={<ReasoningEngine />} />
        <Route path="governance/evolution" element={<Evolution />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
