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
import Overview from './pages/m9/Overview';
import OrgAdmin from './pages/OrgAdmin';
import Permissions from './pages/m9/Permissions';
import Menus from './pages/m9/Menus';
import Monitor from './pages/m9/Monitor';
import Logs from './pages/m9/Logs';
import Settings from './pages/m9/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="m1/datasources" element={<Datasources />} />
        <Route path="m1/views" element={<LogicalViews />} />
        <Route path="m1/pipelines" element={<Pipelines />} />
        <Route path="m2/knowledge" element={<KnowledgeBase />} />
        <Route path="m2/synonyms" element={<Synonyms />} />
        <Route path="m3/ontologies" element={<Ontologies />} />
        <Route path="m3/registry" element={<Registry />} />
        <Route path="m4/instance-360" element={<Instance360 />} />
        <Route path="m4/runtime" element={<RuntimeRules />} />
        <Route path="m8/reviews" element={<Reviews />} />
        <Route path="m7/capability" element={<CapabilityOutlet />} />
        <Route path="m5/query" element={<SemanticQuery />} />
        <Route path="m6/sandbox" element={<Sandbox />} />
        <Route path="m9/overview" element={<Overview />} />
        <Route path="m9/org" element={<OrgAdmin />} />
        <Route path="m9/permissions" element={<Permissions />} />
        <Route path="m9/menus" element={<Menus />} />
        <Route path="m9/monitor" element={<Monitor />} />
        <Route path="m9/logs" element={<Logs />} />
        <Route path="m9/settings" element={<Settings />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
