import React, { useState, useRef, useEffect } from "react";
import "../styles/FusionStudio.css";

const API_BASE = "http://localhost:8000";

function FusionStudio() {
  const [video, setVideo] = useState(null);
  const [detectedStyle, setDetectedStyle] = useState("");
  const [targetStyle, setTargetStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedVideoUrl, setTransformedVideoUrl] = useState(null);
  const [transformProgress, setTransformProgress] = useState("");
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState(null);

  const videoPreviewRef = useRef(null);
  const transformedVideoRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const danceStyles = ["Contemporary", "HipHop", "Kandyan"];

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (transformedVideoUrl) {
        URL.revokeObjectURL(transformedVideoUrl);
      }
    };
  }, [transformedVideoUrl]);

  const resetPreviewVideo = () => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = "";
    }
  };

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];

    if (file && file.type.startsWith("video/")) {
      setVideo(file);
      setDetectedStyle("");
      setTargetStyle("");
      setTransformedVideoUrl(null);
      setError(null);
      setTransformProgress("");
      setJobId(null);
      clearPolling();

      const videoUrl = URL.createObjectURL(file);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.src = videoUrl;
      }
    } else {
      alert("Please upload a valid video file");
    }
  };

  const handleDetectStyle = async () => {
    if (!video) {
      alert("Please upload a video");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", video);

    try {
      const response = await fetch(`${API_BASE}/detect/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status}`);
      }

      const data = await response.json();
      setDetectedStyle(data.dance_style);
    } catch (err) {
      console.error("Detection error:", err);
      setError("Error detecting dance style. Please try again.");
      alert("Error detecting dance style");
    } finally {
      setLoading(false);
    }
  };

  const pollRenderStatus = (currentJobId) => {
    clearPolling();

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/render/status/${currentJobId}`);

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "pending") {
          setTransformProgress("Job queued in Google Colab...");
        } else if (data.status === "processing") {
          setTransformProgress("Rendering 3D video with original music...");
        } else if (data.status === "completed") {
          clearPolling();
          setTransformProgress("Downloading final video...");

          const downloadUrl = `${API_BASE}/render/download/${currentJobId}`;
          setTransformedVideoUrl(downloadUrl);

          setTransformProgress("");
          setIsTransforming(false);

          setTimeout(() => {
            if (transformedVideoRef.current) {
              transformedVideoRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 200);
        } else if (data.status === "failed") {
          clearPolling();
          setIsTransforming(false);
          setTransformProgress("");
          setError("3D rendering failed in Colab. Please try again.");
          alert("3D rendering failed in Colab.");
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearPolling();
        setIsTransforming(false);
        setTransformProgress("");
        setError(`Failed while checking job status: ${err.message}`);
      }
    }, 5000);
  };

  const handleStyleTransfer = async () => {
    if (!targetStyle) {
      alert("Please select a target style");
      return;
    }

    if (!video) {
      alert("Please upload a video first");
      return;
    }

    if (detectedStyle === targetStyle) {
      alert("Target style is the same as the detected style. Please choose a different style.");
      return;
    }

    setIsTransforming(true);
    setTransformedVideoUrl(null);
    setError(null);
    setTransformProgress("Uploading video and creating render job...");
    clearPolling();

    try {
      const formData = new FormData();
      formData.append("file", video);
      formData.append("target_style", targetStyle);

      const response = await fetch(`${API_BASE}/render/transform`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.job_id) {
        throw new Error("No job ID returned from server.");
      }

      setJobId(data.job_id);
      setTransformProgress("Render job created. Waiting for Colab worker...");
      pollRenderStatus(data.job_id);
    } catch (err) {
      console.error("Style transfer error:", err);
      setError(`Transformation failed: ${err.message || "Unknown error occurred"}`);
      alert(`Style transfer failed: ${err.message || "Unknown error occurred"}`);
      setTransformProgress("");
      setIsTransforming(false);
    }
  };

  const handleDownload = () => {
    if (transformedVideoUrl) {
      const a = document.createElement("a");
      a.href = transformedVideoUrl;
      a.download = `transformed_${targetStyle}_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleReset = () => {
    clearPolling();
    setVideo(null);
    setDetectedStyle("");
    setTargetStyle("");
    setTransformedVideoUrl(null);
    setError(null);
    setTransformProgress("");
    setJobId(null);
    resetPreviewVideo();
  };

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
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      const file = files[0];
      setVideo(file);
      setDetectedStyle("");
      setTargetStyle("");
      setTransformedVideoUrl(null);
      setError(null);
      setTransformProgress("");
      setJobId(null);
      clearPolling();

      const videoUrl = URL.createObjectURL(file);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.src = videoUrl;
      }
    } else {
      alert("Please upload a valid video file (MP4, MOV, AVI)");
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
                <label
                  htmlFor="video-upload"
                  className={`file-upload-label ${isDragging ? "drag-over" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="upload-icon">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Browse Video Files or Drag & Drop</span>
                </label>

                {video && (
                  <div className="file-upload-preview">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#a8d8ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                      onClick={(e) => {
                        e.preventDefault();
                        handleReset();
                      }}
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

          {error && (
            <div className="fusion-section archive-container error-section">
              <div className="error-message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#ff4444" strokeWidth="2"/>
                  <path d="M12 8V12" stroke="#ff4444" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 16H12.01" stroke="#ff4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          {detectedStyle && (
            <div className="fusion-section archive-container">
              <div className="style-info">
                <h2>Detected Dance Style</h2>
                <div className="style-display">
                  <span className="video-label">STYLE IDENTIFIED</span>
                  <div className="detected-style-card">
                    <div className="style-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2L15 9L22 10L17 14L18 21L12 17L6 21L7 14L2 10L9 9L12 2Z"
                          stroke="#ff6b9d"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3>{detectedStyle}</h3>
                    <p>AI analysis of your dance video</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  disabled={isTransforming}
                >
                  <option value="">Select transformation style</option>
                  {danceStyles
                    .filter((style) => style !== detectedStyle)
                    .map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
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
                          <path
                            d="M4 12H20M20 12L14 6M20 12L14 18"
                            stroke="#a8d8ea"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                      disabled={isTransforming}
                      style={{
                        background: isTransforming
                          ? "#cccccc"
                          : "linear-gradient(135deg, #a8d8ea 0%, #7b68ee 100%)",
                      }}
                    >
                      {isTransforming ? (
                        <>
                          <span className="loading-spinner"></span>
                          {transformProgress || "Transforming..."}
                        </>
                      ) : (
                        "Start Style Transfer"
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="style-grid">
                <h3>Quick Style Selection</h3>
                <div className="style-chips">
                  {danceStyles
                    .filter((style) => style !== detectedStyle)
                    .map((style) => (
                      <div
                        key={style}
                        className={`style-chip ${targetStyle === style ? "active" : ""}`}
                        onClick={() => !isTransforming && setTargetStyle(style)}
                        style={{
                          cursor: isTransforming ? "not-allowed" : "pointer",
                          opacity: isTransforming ? 0.5 : 1,
                        }}
                      >
                        {style}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {jobId && isTransforming && (
            <div className="fusion-section archive-container">
              <h2>Rendering in Progress</h2>
              <p><strong>Job ID:</strong> {jobId}</p>
              <p>{transformProgress}</p>
            </div>
          )}

          {transformedVideoUrl && (
            <div
              className="fusion-section archive-container result-section"
              ref={transformedVideoRef}
            >
              <div className="result-header">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4L12 14.01L9 11.01" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2>Transformation Complete!</h2>
              </div>

              <p className="result-info">
                Successfully transformed from <strong>{detectedStyle}</strong> to{" "}
                <strong>{targetStyle}</strong>
              </p>

              <div className="transformed-video-container">
                <h3>3D Transformed Dance Video</h3>
                <video
                  src={transformedVideoUrl}
                  controls
                  className="transformed-video"
                  style={{
                    width: "100%",
                    maxWidth: "700px",
                    borderRadius: "8px",
                    margin: "20px auto",
                    display: "block",
                  }}
                />
              </div>

              <div className="action-buttons">
                <button className="download-button" onClick={handleDownload}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download Video
                </button>

                <button className="reset-button" onClick={handleReset}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27542C16.8482 4.26548 15.4745 3.55976 13.9917 3.22426C12.5089 2.88877 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Transform Another Video
                </button>
              </div>
            </div>
          )}

          <div className="music-recommendations">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2V22M5 12H19" stroke="#ffa500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                  Select the target dance style for the transformation.
                </p>
              </div>
              <div className="music-item">
                <h4>4. AI Motion Transfer + 3D Rendering</h4>
                <p className="description">
                  The motion is transformed by AI, rendered as a 3D dance video, and merged with the original music.
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