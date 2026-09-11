import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';
import loaderAnimation from 'assets/lottie/loading.json';

// Authored at 30fps/181 frames (~6s). lottie-react has no declarative speed
// prop -- lottie-web's playback rate is only settable imperatively via
// setSpeed() through lottieRef, so this bumps it to ~1.5s without
// re-exporting or hand-editing the animation's frame data.
const PLAYBACK_SPEED = 4;

const GlobalLoader = ({ size = 96 }) => {
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
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
      </Box>
    </Box>
  );

  return ReactDOM.createPortal(loaderElement, document.body);
};

export default GlobalLoader;
