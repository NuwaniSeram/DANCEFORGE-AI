import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

function Library() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;
  const categories = ['All', 'Udarata', 'Pahatharata', 'Bharata', 'Hip Hop', 'Ballet', 'Kathak'];

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/videos/`);
        setVideos(response.data.videos || []);
      } catch (err) {
        setError('Failed to load videos. Please make sure the backend is running.');
        console.error('Error loading videos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

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
    if (text.includes('hiphop') || text.includes('hip-hop') || text.includes('hip hop')) {
      return 'Hip Hop';
    }
    if (text.includes('ballet')) {
      return 'Ballet';
    }
    if (text.includes('kathak')) {
      return 'Kathak';
    }
    return 'Other';
  };

  const filteredVideos = selectedCategory === 'All'
    ? videos
    : videos.filter((video) => getCategory(video) === selectedCategory);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="archive-container">
      <div className="archive-header">
        <h1>Full Library</h1>
        <p>Explore dance choreography videos categorized into distinct styles.</p>
      </div>

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

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading videos...</div>
      ) : filteredVideos.length === 0 ? (
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

      {filteredVideos.length > 0 && (
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
    </div>
  );
}

export default Library;
