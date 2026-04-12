import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import RankingsPage from './pages/RankingsPage';
import ConflictPage from './pages/ConflictPage';
import FlightsPage from './pages/FlightsPage';
import SearchPage from './pages/SearchPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/rankings"  element={<RankingsPage />} />
        <Route path="/conflict"  element={<ConflictPage />} />
        <Route path="/flights"   element={<FlightsPage />} />
        <Route path="/search"    element={<SearchPage />} />
      </Routes>
    </App>
  </BrowserRouter>
);
