import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGoogleMapsScript } from '../../hooks/useGoogleMapsScript';

const GooglePlacesInput = ({ onPlaceSelect, placeholder = 'Type business name or address...' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const { loaded: mapsLoaded, error: mapsLoadError } = useGoogleMapsScript();
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const containerRef = useRef(null);

  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; }, [onPlaceSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e) => { if (!containerRef.current?.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!mapsLoaded || !query.trim()) return;
    setLoading(true);
    setError('');
    setSuggestions([]);
    console.log('[GooglePlaces] Searching:', query); // eslint-disable-line no-console

    try {
      const { suggestions: results } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query.trim(),
        includedRegionCodes: ['in']
      });
      console.log('[GooglePlaces] Results:', results?.length); // eslint-disable-line no-console
      if (results?.length) {
        setSuggestions(results);
        setShowDropdown(true);
      } else {
        setError('No results found. Try a different search.');
      }
    } catch (e) {
      console.error('[GooglePlaces] Search error:', e); // eslint-disable-line no-console
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, mapsLoaded]);

  useEffect(() => {
    if (mapsLoadError) {
      setSuggestions([]);
      setShowDropdown(false);
      setError(mapsLoadError);
    }
  }, [mapsLoadError]);

  const handleSelect = useCallback(async (suggestion) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents', 'location', 'formattedAddress'] });
      console.log('[GooglePlaces] Place:', place); // eslint-disable-line no-console

      const components = place.addressComponents || [];
      const get = (types) => {
        const c = components.find(c => types.some(t => c.types.includes(t)));
        return c?.longText || '';
      };

      const streetNumber = get(['street_number', 'premise']);
      const route = get(['route']);
      const sublocality = get(['sublocality_level_1', 'sublocality', 'neighborhood']);
      const streetParts = [streetNumber, route, sublocality].filter(Boolean);

      const result = {
        street: streetParts.join(', ') || get(['locality']),
        pincode: get(['postal_code']),
        location: get(['locality']) || get(['administrative_area_level_2']),
        lat: place.location?.lat(),
        lng: place.location?.lng(),
        formattedAddress: place.formattedAddress
      };

      console.log('[GooglePlaces] Parsed:', result); // eslint-disable-line no-console
      onPlaceSelectRef.current(result);
    } catch (e) {
      console.error('[GooglePlaces] Details error:', e); // eslint-disable-line no-console
      setError('Failed to get place details. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={mapsLoaded ? placeholder : 'Google Places unavailable'}
          disabled={!mapsLoaded}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '2px dashed #FF8C00',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: mapsLoaded ? '#fff8f0' : '#f5f5f5',
            color: mapsLoaded ? '#333' : '#777',
            boxSizing: 'border-box'
          }}
          onFocus={e => e.target.style.borderColor = '#D97800'}
          onBlur={e => e.target.style.borderColor = '#FF8C00'}
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={!mapsLoaded || !query.trim() || loading}
          style={{
            padding: '10px 18px',
            backgroundColor: mapsLoaded && query.trim() && !loading ? '#FF8C00' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: mapsLoaded && query.trim() && !loading ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            minWidth: '90px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => { if (mapsLoaded && query.trim() && !loading) e.target.style.backgroundColor = '#D97800'; }}
          onMouseLeave={e => { if (mapsLoaded && query.trim() && !loading) e.target.style.backgroundColor = '#FF8C00'; }}
        >
          {loading ? '⏳' : '🔍 Search'}
        </button>
      </div>

      {error && <p style={{ color: '#d32f2f', fontSize: '12px', margin: '4px 0 0 0' }}>{error}</p>}

      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', margin: '4px 0 0 0',
          padding: 0, listStyle: 'none', maxHeight: '240px', overflowY: 'auto'
        }}>
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0', color: '#333' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff8f0'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
            >
              📍 {s.placePrediction?.text?.text || s.placePrediction?.mainText?.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GooglePlacesInput;
