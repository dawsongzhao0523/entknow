import { Route, Routes } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';
import Ontologies from './pages/Ontologies';
import Registry from './pages/Registry';
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
        <Route path="assets/datasources" element={<Datasources />} />
        <Route path="assets/views" element={<LogicalViews />} />
        <Route path="assets/pipelines" element={<Pipelines />} />
        <Route path="knowledge/entries" element={<KnowledgeBase />} />
        <Route path="knowledge/synonyms" element={<Synonyms />} />
        <Route path="modeling/ontologies" element={<Ontologies />} />
        <Route path="modeling/registry" element={<Registry />} />
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
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
