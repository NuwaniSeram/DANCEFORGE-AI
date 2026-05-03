//App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import DigitalArchive from './pages/DigitalArchive';
import Library from './pages/Library';
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import FusionStudio from './pages/FusionStudio';
import Page4 from './pages/Page4';
import EmotionAnalysis from './pages/emotionAnalysis';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">DanceForge AI</Link>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/archive" className={location.pathname === '/archive' ? 'active' : ''}>
            Digital Archive
          </Link>
        </li>
        <li>
          <Link to="/emotion" className={location.pathname === '/emotion' ? 'active' : ''}>
          Choreography Studio
        </Link>
        </li>
        <li>
          <Link to="/page2" className={location.pathname === '/page2' ? 'active' : ''}>
  Performance Analysis
</Link>
        </li>
        <li>
          <Link to="/fusionstudio" className={location.pathname === '/fusionstudio' ? 'active' : ''}>
            Fusion Studio
          </Link>
        </li>
        <li>
          <Link to="/page4" className={location.pathname === '/page4' ? 'active' : ''}>
            Page 4
          </Link>
        </li>
        
      </ul>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/archive" element={<DigitalArchive />} />
            <Route path="/library" element={<Library />} />
            <Route path="/page1" element={<Page1 />} />
            <Route path="/page2" element={<Page2 />} />
            <Route path="/fusionstudio" element={<FusionStudio />} />
            <Route path="/page4" element={<Page4 />} />
            <Route path="/emotion" element={<EmotionAnalysis />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
