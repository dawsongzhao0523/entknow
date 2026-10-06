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
import OrgAdmin from './pages/OrgAdmin';
import CapabilityOutlet from './pages/CapabilityOutlet';
import SemanticQuery from './pages/SemanticQuery';
import LogicalViews from './pages/LogicalViews';
import Pipelines from './pages/Pipelines';
import Sandbox from './pages/Sandbox';
import Placeholder from './pages/Placeholder';

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
        <Route path="m9/org" element={<OrgAdmin />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
