import { useState, useEffect } from 'react';

const SCRIPT_ID = 'google-maps-places-script';
let loadPromise = null;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

export const useGoogleMapsScript = () => {
  const [loaded, setLoaded] = useState(() => !!window.google?.maps?.places);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.google?.maps?.places) {
      setLoaded(true);
      setError('');
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setLoaded(false);
      setError('Google Maps API key is missing.');
      return;
    }

    if (!loadPromise) {
      loadPromise = new Promise((resolve, reject) => {
        if (document.getElementById(SCRIPT_ID)) {
          // Script tag exists but may not be loaded yet — wait for it
          const existing = document.getElementById(SCRIPT_ID);
          if (window.google?.maps?.places) { resolve(); return; }
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        // Use v=beta for the new Places API and loading=async for performance.
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=beta&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          // Wait for places library to be fully ready
          const wait = setInterval(() => {
            if (window.google?.maps?.places) { clearInterval(wait); resolve(); }
          }, 50);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    loadPromise
      .then(() => {
        setLoaded(true);
        setError('');
      })
      .catch(err => {
        setLoaded(false);
        setError(err?.message || 'Google Maps failed to load.');
      });
  }, []);

  return { loaded, error };
};
