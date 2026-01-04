//FusionStudio
import React, { useState } from "react";
import "../styles/FusionStudio.css";

function FusionStudio() {
  const [video, setVideo] = useState(null);
  const [detectedStyle, setDetectedStyle] = useState("");
  const [targetStyle, setTargetStyle] = useState("");
  const [loading, setLoading] = useState(false);

  const danceStyles = [
    "Contemporary",
    "Hip Hop",
    "Kandyan",
    "Ballet",
    "Folk Dance"
  ];

  const handleVideoChange = (e) => {
    setVideo(e.target.files[0]);
    setDetectedStyle("");
    setTargetStyle("");
  };

  const handleDetectStyle = () => {
    if (!video) return alert("Please upload a video");

    setLoading(true);
    setTimeout(() => {
      setDetectedStyle("Contemporary");
      setLoading(false);
    }, 1500);
  };

  const handleStyleTransfer = () => {
    if (!targetStyle) return alert("Please select a target style");
    alert(`Starting style transfer from ${detectedStyle} to ${targetStyle}`);
    // Add your style transfer logic here
  };

  const [isDragging, setIsDragging] = useState(false);

const handleDragOver = (e) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith('video/')) {
    setVideo(files[0]);
    setDetectedStyle("");
    setTargetStyle("");
  } else {
    alert('Please upload a valid video file (MP4, MOV, AVI)');
  }
};

  return (
    <div className="main-content">
      <div className="fusion-dashboard">
        <div className="dashboard-header">
          <h1>Dance Style Fusion Studio</h1>
          <p>
            Upload a dance video to identify its style and transform it into another
            cultural dance form using AI-powered motion transfer.
          </p>
        </div>

        <div className="fusion-content">
          {/* Upload Section */}
<div className="fusion-section archive-container">
  <h2>Upload Dance Video</h2>
  <div className="upload-area">
    <div className="file-upload-wrapper">
      <input
        type="file"
        id="video-upload"
        accept="video/*"
        className="file-upload-input"
        onChange={handleVideoChange}
      />
      <label htmlFor="video-upload" className={`file-upload-label ${isDragging ? 'drag-over' : ''}`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="upload-icon">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Browse Video Files</span>
      </label>
      {video && (
        <div className="file-upload-preview">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 21.7907 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H9H8" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="file-info">
            <span className="file-name">{video.name}</span>
            <span className="file-size">
              {(video.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <button 
            className="clear-file-btn"
            onClick={() => setVideo(null)}
            aria-label="Remove file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
    <p className="upload-hint">
      Supports MP4, MOV, AVI up to 500MB. Ensure good lighting and full body visibility.
    </p>
  </div>

  <button
    className="search-button"
    onClick={handleDetectStyle}
    disabled={loading || !video}
  >
    {loading ? (
      <>
        <span className="loading-spinner"></span>
        Detecting Style...
      </>
    ) : (
      "Detect Dance Style"
    )}
  </button>
</div>

          {/* Detected Style Section */}
          {detectedStyle && (
            <div className="fusion-section archive-container">
              <div className="style-info">
                <h2>Detected Dance Style</h2>
                <div className="style-display">
                  <span className="video-label">STYLE IDENTIFIED</span>
                  <div className="detected-style-card">
                    <div className="style-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L15 9L22 10L17 14L18 21L12 17L6 21L7 14L2 10L9 9L12 2Z" 
                              stroke="#ff6b9d" strokeWidth="2" strokeLinecap="round" 
                              strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3>{detectedStyle}</h3>
                    <p>AI analysis of your dance video</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Target Style Selection */}
          {detectedStyle && (
            <div className="fusion-section archive-container">
              <h2>Select Target Dance Style</h2>
              <p className="section-description">
                Choose a cultural dance style to transform your dance into
              </p>
              
              <div className="style-selection">
                <select
                  className="search-input"
                  value={targetStyle}
                  onChange={(e) => setTargetStyle(e.target.value)}
                >
                  <option value="">Select transformation style</option>
                  {danceStyles
                    .filter(style => style !== detectedStyle)
                    .map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                </select>

                {targetStyle && (
                  <div className="style-transfer-preview">
                    <div className="style-comparison">
                      <div className="style-from">
                        <span className="video-label">FROM</span>
                        <h4>{detectedStyle}</h4>
                      </div>
                      <div className="transfer-arrow">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M4 12H20M20 12L14 6M20 12L14 18" 
                                stroke="#a8d8ea" strokeWidth="2" 
                                strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="style-to">
                        <span className="video-label">TO</span>
                        <h4>{targetStyle}</h4>
                      </div>
                    </div>

                    <button 
                      className="search-button"
                      onClick={handleStyleTransfer}
                      style={{
                        background: "linear-gradient(135deg, #a8d8ea 0%, #7b68ee 100%)"
                      }}
                    >
                      Start Style Transfer
                    </button>
                  </div>
                )}
              </div>

              {/* Style Grid for Quick Selection */}
              <div className="style-grid">
                <h3>Popular Transformations</h3>
                <div className="style-chips">
                  {danceStyles
                    .filter(style => style !== detectedStyle)
                    .map((style) => (
                      <div
                        key={style}
                        className={`style-chip ${targetStyle === style ? 'active' : ''}`}
                        onClick={() => setTargetStyle(style)}
                      >
                        {style}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="music-recommendations">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2V22M5 12H19" stroke="#ffa500" strokeWidth="2" 
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              How It Works
            </h3>
            <div className="music-list">
              <div className="music-item">
                <h4>1. Upload Your Dance Video</h4>
                <p className="description">
                  Upload a clear video of your dance performance. Ensure good lighting and full body visibility.
                </p>
              </div>
              <div className="music-item">
                <h4>2. AI Style Detection</h4>
                <p className="description">
                  Our AI analyzes your movements and identifies the dance style with high accuracy.
                </p>
              </div>
              <div className="music-item">
                <h4>3. Choose Target Style</h4>
                <p className="description">
                  Select a cultural dance style you want to transform your dance into.
                </p>
              </div>
              <div className="music-item">
                <h4>4. AI Motion Transfer</h4>
                <p className="description">
                  Our advanced AI seamlessly transfers your movements to the target dance style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FusionStudio;