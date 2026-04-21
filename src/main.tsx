import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing     from './pages/Landing';
import NewRace     from './pages/NewRace';
import RaceView    from './pages/RaceView';
import TvView      from './pages/TvView';
import RunnerView  from './pages/RunnerView';
import AdminView   from './pages/AdminView';
import 'leaflet/dist/leaflet.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<Landing />} />
        <Route path="/new"                element={<NewRace />} />
        <Route path="/race/:code"         element={<RaceView />} />
        <Route path="/race/:code/tv"      element={<TvView />} />
        <Route path="/race/:code/run"     element={<RunnerView />} />
        <Route path="/race/:code/admin"   element={<AdminView />} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
