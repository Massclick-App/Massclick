import React from 'react';
import { useSelector } from 'react-redux';

const MaintenanceOverlay = () => {
  const { isMaintenanceMode, message, detail, retryAfter } = useSelector((state) => state.maintenance || {});

  if (!isMaintenanceMode) {
    return null;
  }

  const isAdminRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/admin' || window.location.pathname.startsWith('/dashboard'));

  if (isAdminRoute) {
    return null;
  }

  const retryAfterMinutes =
    Number.isFinite(Number(retryAfter)) && Number(retryAfter) > 0
      ? Math.max(1, Math.ceil(Number(retryAfter) / 60))
      : null;
  const primaryCopy = detail || "We're making a few improvements right now. We'll be back soon.";
  const secondaryCopy = retryAfterMinutes
    ? `Please check back in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`
    : "Thanks for your patience while we get everything ready again.";

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at top, rgba(251, 191, 36, 0.16), transparent 30%), linear-gradient(135deg, #0f172a 0%, #111827 45%, #1f2937 100%)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'auto',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
          borderRadius: '28px',
          padding: '40px 32px',
          textAlign: 'center',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.45)',
          pointerEvents: 'auto',
          border: '1px solid rgba(148, 163, 184, 0.22)',
        }}
      >
        <div
          style={{
            width: '88px',
            height: '88px',
            margin: '0 auto 24px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            fontWeight: 700,
            boxShadow: '0 18px 38px rgba(249, 115, 22, 0.3)',
          }}
        >
          MC
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(249, 115, 22, 0.12)',
            color: '#c2410c',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '18px',
          }}
        >
          Maintenance in progress
        </div>

        <h1
          style={{
            fontSize: '34px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 14px 0',
            lineHeight: 1.15,
          }}
        >
          We&apos;ll be back soon
        </h1>

        <p
          style={{
            fontSize: '17px',
            color: '#475569',
            margin: '0 0 14px 0',
            lineHeight: '1.6',
          }}
        >
          {primaryCopy}
        </p>

        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '0 0 28px 0',
            lineHeight: '1.6',
          }}
        >
          {secondaryCopy}
        </p>

        <div
          style={{
            borderRadius: '20px',
            padding: '18px 20px',
            background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.95), rgba(254, 242, 242, 0.95))',
            border: '1px solid rgba(251, 146, 60, 0.2)',
            color: '#9a3412',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Status
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#7c2d12',
              marginBottom: '6px',
            }}
          >
            {message || 'Service Unavailable'}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#9a3412',
              lineHeight: '1.6',
            }}
          >
            Our team is actively working on this. No action is needed from you.
          </div>
        </div>

      </div>
    </div>
  );
};

export default MaintenanceOverlay;
