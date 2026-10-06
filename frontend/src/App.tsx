import { Route, Routes } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';
import Ontologies from './pages/Ontologies';
import Registry from './pages/Registry';
import Datasources from './pages/Datasources';
import Reviews from './pages/Reviews';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="m1/datasources" element={<Datasources />} />
        <Route path="m3/ontologies" element={<Ontologies />} />
        <Route path="m3/registry" element={<Registry />} />
        <Route path="m8/reviews" element={<Reviews />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
