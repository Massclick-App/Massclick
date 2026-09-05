import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';
import loaderAnimation from 'assets/lottie/loading.json';

// Authored at 30fps/181 frames (~6s). lottie-react has no declarative speed
// prop -- lottie-web's playback rate is only settable imperatively via
// setSpeed() through lottieRef, so this bumps it to ~3s without re-exporting
// or hand-editing the animation's frame data.
const PLAYBACK_SPEED = 2;

const GlobalLoader = ({ size = 350, message = '' }) => {
  const lottieRef = useRef(null);

  useEffect(() => {
    lottieRef.current?.setSpeed(PLAYBACK_SPEED);
  }, []);

  const loaderElement = (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ width: size, height: size }}>
          <Lottie
            lottieRef={lottieRef}
            animationData={loaderAnimation}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
        {message && (
          <Box sx={{ fontSize: 24, color: '#fff', fontWeight: 700, textAlign: 'center', mt: 3 }}>
            {message}
          </Box>
        )}
      </Box>
    </Box>
  );

  return ReactDOM.createPortal(loaderElement, document.body);
};

export default GlobalLoader;
