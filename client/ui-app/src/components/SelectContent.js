import * as React from 'react';
import MI from '../assets/Mi.png';

export default function SelectContent() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: '1.8rem',
        color: '#ea6d11',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      <img
        src={MI}
        alt="Logo"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />

      <span>
        Mass<span style={{ color: '#ff9c3b' }}>click</span>
      </span>
    </div>


  );
}
