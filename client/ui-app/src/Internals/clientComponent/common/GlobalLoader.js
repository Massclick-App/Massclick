import React from 'react';
import ReactDOM from 'react-dom';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';
import loaderAnimation from '../../../assets/lottie/loading.json';

const GlobalLoader = ({ size = 350, message = '' }) => {
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
