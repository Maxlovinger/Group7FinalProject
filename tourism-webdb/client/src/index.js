import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import RankingsPage from './pages/RankingsPage';
import ConflictPage from './pages/ConflictPage';
import FlightsPage from './pages/FlightsPage';
import SearchPage from './pages/SearchPage';
import RiskRewardPage from './pages/RiskRewardPage';
import GDPPage from './pages/GDPPage';
import RecoveryPage from './pages/RecoveryPage';
import CityExplorerPage from './pages/CityExplorerPage';
import ComparePage from './pages/ComparePage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/conflict" element={<ConflictPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/risk" element={<RiskRewardPage />} />
        <Route path="/gdp" element={<GDPPage />} />
        <Route path="/recovery" element={<RecoveryPage />} />
        <Route path="/city" element={<CityExplorerPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </App>
  </BrowserRouter>
);
