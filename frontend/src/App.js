import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import DigitalArchive from './pages/DigitalArchive';
import Library from './pages/Library';
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import Page3 from './pages/Page3';
import Page4 from './pages/Page4';
import AdminPortal from './pages/AdminPortal';
import SearchPage from './pages/SearchPage';

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
          <Link to="/search" className={location.pathname === '/search' ? 'active' : ''}>
            AI Search
          </Link>
        </li>
        <li>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            Admin Portal
          </Link>
        </li>
        <li>
          <Link to="/page3" className={location.pathname === '/page3' ? 'active' : ''}>
            Page 3
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
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/page3" element={<Page3 />} />
            <Route path="/page4" element={<Page4 />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
