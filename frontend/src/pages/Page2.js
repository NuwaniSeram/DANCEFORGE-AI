import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import VideoWithPose from '../components/VideoWithPose';

function Page2() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a temporary local URL for the uploaded file
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoFile(file);
    }
  };

  return (
    <div className="archive-container" style={{ padding: '2rem' }}>
      <div className="archive-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1>Performance Analysis</h1>
        <p>Upload a performance video and use our local AI to track and analyze movements.</p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {!videoUrl ? (
          <div 
            style={{ 
              border: '2px dashed #ccc', 
              borderRadius: '12px', 
              padding: '4rem 2rem', 
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => document.getElementById('video-upload').click()}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#3B82F6'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#ccc'}
          >
            <Upload size={48} color="#666" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Upload a Video</h3>
            <p style={{ color: '#666' }}>Click here to select an MP4 file from your device</p>
            <input 
              id="video-upload"
              type="file" 
              accept="video/mp4,video/x-m4v,video/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>
        ) : (
          <div>
            <button 
              onClick={() => {
                setVideoUrl(null);
                setVideoFile(null);
              }}
              className="clear-search-btn"
              style={{ marginBottom: '1rem', display: 'inline-block' }}
            >
              ← Upload a Different Video
            </button>
            
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '1rem', color: '#333' }}>Analyzing: {videoFile?.name}</h3>
              <VideoWithPose src={videoUrl} type={videoFile?.type || "video/mp4"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Page2;
