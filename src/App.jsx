import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import TabletPage from './pages/TabletPage';
import StagePage from './pages/StagePage';
import MembersPage from './pages/MembersPage';
import TemplatesPage from './pages/TemplatesPage';
import ActivitiesPage from './pages/ActivitiesPage';

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">Church Event Manager</h1>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link to="/admin" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Admin</Link>
        <Link to="/activities" className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Activités</Link>
        <Link to="/tablet" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Tablet Remote</Link>
        <Link to="/stage" className="px-6 py-3 bg-black text-white rounded-lg hover:opacity-80">Stage Display</Link>
        <Link to="/members" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">Members</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/tablet" element={<TabletPage />} />
        <Route path="/stage" element={<StagePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
