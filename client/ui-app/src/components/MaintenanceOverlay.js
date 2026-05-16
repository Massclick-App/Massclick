import React from 'react';
import { useSelector } from 'react-redux';

const MaintenanceOverlay = () => {
  const { isMaintenanceMode } = useSelector((state) => state.maintenance || {});
  const { user } = useSelector((state) => state.auth || {});

  if (!isMaintenanceMode) {
    return null;
  }

  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isAdmin ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: isAdmin ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔧</div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0 0 16px 0',
          }}
        >
          System Under Maintenance
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: '0 0 32px 0',
            lineHeight: '1.6',
          }}
        >
          We're currently performing scheduled maintenance to improve our service. We'll be back online shortly.
        </p>

        <p
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            margin: 0,
          }}
        >
          Thank you for your patience!
        </p>

        {isAdmin && (
          <div
            style={{
              marginTop: '32px',
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#0369a1',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ℹ️ Admin mode active - Maintenance overlay is visible but not blocking
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
