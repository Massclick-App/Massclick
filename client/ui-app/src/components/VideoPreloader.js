import React, { useState, useEffect, useRef } from 'react';

const VideoPreloader = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.5;
      videoRef.current.play();
    }
    const timer = setTimeout(() => setShowPreloader(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleVideoEnded = () => {
    setShowPreloader(false);
  };

  if (!showPreloader) {
    return null;
  }

  const videoSrc = `${process.env.PUBLIC_URL}/prerender.mp4`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        zIndex: 9999,
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        onEnded={handleVideoEnded}
        style={{
          width: '60%',
          height: 'auto',
          maxWidth: '600px',
          maxHeight: '600px',
          objectFit: 'contain',
          borderRadius: '8px',
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
};

export default VideoPreloader;
