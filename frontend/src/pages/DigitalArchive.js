import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Music } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function DigitalArchive() {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults, selectedCategory]);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/videos/`);
      setVideos(response.data.videos);
    } catch (err) {
      setError('Failed to load videos. Please make sure the backend is running.');
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setError(null);
    setSearchResults(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/videos/search`, {
        query: searchQuery,
      });
      setSearchResults(response.data);
    } catch (err) {
      setError('Search failed. Please check your GEMINI_API_KEY in the backend .env file.');
      console.error('Error searching:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setSearchQuery(example);
  };

  const exampleQueries = [
    'graceful female dance',
    'traditional drum dance',
    'high energy performance',
    'solo performance',
    'up-country dance style',
  ];

  const categories = ['All', 'Udarata', 'Pahatharata', 'Bharata', 'Western'];

  const getCategory = (video) => {
    const text = [
      video.label,
      video.type,
      video.description,
      video.fullDescription,
      video.filename,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (text.includes('udarata') || text.includes('up country') || text.includes('up-country')) {
      return 'Udarata';
    }
    if (text.includes('pahatharata') || text.includes('low country')) {
      return 'Pahatharata';
    }
    if (text.includes('bharatanatyam') || text.includes('bharata')) {
      return 'Bharata';
    }
    if (text.includes('western')) {
      return 'Western';
    }
    return 'Other';
  };

  const displayVideos = searchResults?.matches || [];
  const filteredVideos = selectedCategory === 'All'
    ? displayVideos
    : displayVideos.filter((video) => getCategory(video) === selectedCategory);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="archive-container">
      <div className="archive-header">
        <h1>Digital Archive</h1>
        <p>Browse our collection of traditional dance videos. Use AI search to find videos based on your description.</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Describe what kind of dance or video you're looking for..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searchLoading}
          />
          <button
            type="submit"
            className="search-button"
            disabled={searchLoading || !searchQuery.trim()}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        <div className="search-examples">
          <span style={{ marginRight: '0.5rem', color: '#666' }}>Examples:</span>
          {exampleQueries.map((example, index) => (
            <span
              key={index}
              className="example-chip"
              onClick={() => handleExampleClick(example)}
            >
              {example}
            </span>
          ))}
        </div>
      </div>

      {searchResults && (
        <div className="filter-bar">
          <span className="filter-label">Category:</span>
          <div className="filter-chips">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {searchResults && (
        <div className="search-results">
          {searchResults.explanation && (
            <div className="results-section">
              <h2>Search Results</h2>
              <p>{searchResults.explanation}</p>
            </div>
          )}

          {searchResults.choreography_suggestions && (
            <div className="results-section">
              <h2>Choreography Suggestions</h2>
              <p>{searchResults.choreography_suggestions}</p>
            </div>
          )}

          {searchResults.musicRecommendations && searchResults.musicRecommendations.length > 0 && (
            <div className="music-recommendations">
              <h3>
                <Music size={24} strokeWidth={2} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Recommended Music
              </h3>
              <ul className="music-list">
                {searchResults.musicRecommendations.map((music, index) => (
                  <li key={index} className="music-item">
                    <h4>{music.title}</h4>
                    {music.artist && <div className="artist">by {music.artist}</div>}
                    {music.style && <div className="artist">Style: {music.style}</div>}
                    {music.description && <div className="description">{music.description}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {loading && <div className="loading">Loading videos...</div>}

      {searchResults && !loading && (
        <div>
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#333' }}>
            Matched Videos
          </h2>

          {filteredVideos.length === 0 ? (
            <div className="loading">No videos found.</div>
          ) : (
            <div className="video-grid">
              {paginatedVideos.map((video) => (
                <div key={video.filename} className="video-card">
                  <div className="video-wrapper">
                    <video controls>
                      <source src={`${API_BASE_URL}${video.url}`} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="video-info">
                    <span className="video-label">{video.label}</span>
                    <h3>{video.filename.replace('.mp4', '')}</h3>
                    {video.type && (
                      <div className="video-label" style={{ marginTop: '0.5rem' }}>
                        {video.type}
                      </div>
                    )}
                    <p className="video-description">{video.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {searchResults && filteredVideos.length > 0 && (
        <div className="pagination">
          <button
            type="button"
            className="page-button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
          >
            Prev
          </button>
          <div className="page-info">
            Page {safePage} of {totalPages}
          </div>
          <button
            type="button"
            className="page-button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safePage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {searchResults && (
        <button
          onClick={() => {
            setSearchResults(null);
            setSearchQuery('');
          }}
          className="clear-search-btn"
        >
          Clear Search
        </button>
      )}

      <div className="library-cta">
        <a className="library-button" href="/library">
          Go to Full Library
        </a>
      </div>
    </div>
  );
}

export default DigitalArchive;
