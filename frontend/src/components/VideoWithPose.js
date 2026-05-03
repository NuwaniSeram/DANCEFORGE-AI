import React, { useRef, useEffect, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { Download, Ghost, Eye, Loader2, Sparkles } from 'lucide-react';

const VideoWithPose = ({ src, type }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [isXrayEnabled, setIsXrayEnabled] = useState(false);
  const [isSkeletonOnly, setIsSkeletonOnly] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let isMounted = true;
    const initializeModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        
        if (isMounted) {
          setPoseLandmarker(landmarker);
          setIsModelLoading(false);
        } else {
          landmarker.close();
        }
      } catch (error) {
        console.error("Failed to load PoseLandmarker:", error);
        if (isMounted) setIsModelLoading(false);
      }
    };
    initializeModel();
    
    return () => {
      isMounted = false;
      if (poseLandmarker) poseLandmarker.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  // eslint-disable-next-line
  }, []);

  const predictFrame = (isExporting = false) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !poseLandmarker || (!isXrayEnabled && !isExporting)) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (canvas && !isXrayEnabled && !isExporting) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    const drawingUtils = new DrawingUtils(ctx);

    if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    let startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== video.currentTime && video.videoWidth > 0) {
      lastVideoTimeRef.current = video.currentTime;
      
      const results = poseLandmarker.detectForVideo(video, startTimeMs);
      
      ctx.save();
      // If skeleton only OR processing for export, fill with solid black
      if (isSkeletonOnly || isExporting) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      if (results.landmarks) {
        for (const landmark of results.landmarks) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from?.z, -0.15, 0.1, 5, 1),
            color: '#00FF00', 
            fillColor: '#FFFFFF',
            lineWidth: 2
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 4
          });
        }
      }
      ctx.restore();

      if (isExporting) {
        setProcessingProgress((video.currentTime / video.duration) * 100);
      }
    }
    
    animationRef.current = requestAnimationFrame(() => predictFrame(isExporting));
  };

  useEffect(() => {
    if (isXrayEnabled && !isProcessing) {
      animationRef.current = requestAnimationFrame(() => predictFrame(false));
    } else if (!isProcessing) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  // eslint-disable-next-line
  }, [isXrayEnabled, isSkeletonOnly, poseLandmarker, isProcessing]);

  const toggleXray = () => {
    setIsXrayEnabled(!isXrayEnabled);
    if (isXrayEnabled) setIsSkeletonOnly(false);
  };

  const toggleSkeletonOnly = () => {
    setIsSkeletonOnly(!isSkeletonOnly);
  };

  const handleOneClickExport = async () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarker) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Preparation
    setIsProcessing(true);
    setProcessingProgress(0);
    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    // Pause and reset
    video.pause();
    video.currentTime = 0;
    
    // Wait for seek
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    // Setup Recording with Audio
    let stream;
    try {
      // captureStream(30) captures the canvas video
      const canvasStream = canvas.captureStream(30);
      
      // Try to capture audio from the video element
      let audioTrack = null;
      if (video.captureStream) {
        const videoStream = video.captureStream();
        audioTrack = videoStream.getAudioTracks()[0];
      } else if (video.mozCaptureStream) {
        const videoStream = video.mozCaptureStream();
        audioTrack = videoStream.getAudioTracks()[0];
      }
      
      const tracks = [canvasStream.getVideoTracks()[0]];
      if (audioTrack) tracks.push(audioTrack);
      
      stream = new MediaStream(tracks);
    } catch (e) {
      console.warn("Audio capture failed, exporting video only", e);
      stream = canvas.captureStream(30);
    }

    const mimeTypes = ['video/mp4', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'];
    const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    
    recordedChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: supportedMimeType });

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `dance-skeleton-${Date.now()}.${extension}`;
      a.click();
      
      // Restore state
      setIsProcessing(false);
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
    };

    // Start
    mediaRecorderRef.current.start();
    predictFrame(true); // Start processing frames
    video.play();

    // Auto-stop at end
    const onEnded = () => {
      video.removeEventListener('ended', onEnded);
      mediaRecorderRef.current.stop();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    video.addEventListener('ended', onEnded);
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <video 
          ref={videoRef} 
          controls={!isProcessing} 
          style={{ 
            width: '100%', 
            display: 'block',
            visibility: (isSkeletonOnly || isProcessing) ? 'hidden' : 'visible'
          }}
          crossOrigin="anonymous"
        >
          <source src={src} type={type || "video/mp4"} />
        </video>
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none',
            zIndex: 10,
            backgroundColor: (isSkeletonOnly || isProcessing) ? '#000' : 'transparent'
          }} 
        />

        {/* Processing Overlay */}
        {isProcessing && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 20, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', color: 'white'
          }}>
            <Loader2 className="animate-spin" size={48} style={{ marginBottom: '1rem', color: '#10B981' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Processing...</h3>
            <p>Capturing movement and audio</p>
            <div style={{ width: '60%', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '1.5rem', overflow: 'hidden' }}>
              <div style={{ width: `${processingProgress}%`, height: '100%', backgroundColor: '#10B981', transition: 'width 0.1s' }}></div>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#888' }}>{Math.round(processingProgress)}% complete</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={toggleXray}
          disabled={isModelLoading || isProcessing}
          style={{
            backgroundColor: isModelLoading ? '#4b5563' : (isXrayEnabled ? '#10B981' : '#374151'),
            color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px',
            cursor: (isModelLoading || isProcessing) ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.3s ease', boxShadow: isXrayEnabled ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {isModelLoading ? 'Loading AI...' : (isXrayEnabled ? 'AI View: ON' : 'AI View')}
        </button>

        {isXrayEnabled && !isProcessing && (
          <button 
            onClick={toggleSkeletonOnly}
            style={{
              backgroundColor: isSkeletonOnly ? '#8B5CF6' : '#4b5563',
              color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px',
              cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.3s ease'
            }}
          >
            {isSkeletonOnly ? <Eye size={18} /> : <Ghost size={18} />}
            {isSkeletonOnly ? 'Show Dancer' : 'Skeleton Mode'}
          </button>
        )}

        <button 
          onClick={handleOneClickExport}
          disabled={isModelLoading || isProcessing}
          style={{
            backgroundColor: '#10B981',
            color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px',
            cursor: (isModelLoading || isProcessing) ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem',
            transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Sparkles size={18} />
          {isProcessing ? 'Processing AI...' : 'One-Click AI Export (MP4)'}
        </button>
      </div>
    </div>
  );
};

export default VideoWithPose;
