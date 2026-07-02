import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./weatherWidget.module.css";

const cx = createScopedClassNames(styles);

const HIDDEN_STORAGE_KEY = "weatherWidgetHidden";
const CACHE_TTL_MS = 30 * 60 * 1000;

const WEATHER_CODE_MAP = {
  0: { icon: "☀️", label: "Clear sky" },
  1: { icon: "🌤️", label: "Mostly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌧️", label: "Dense drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  80: { icon: "🌦️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Rain showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm w/ hail" },
  99: { icon: "⛈️", label: "Thunderstorm w/ hail" },
};

const getWeatherInfo = (code) =>
  WEATHER_CODE_MAP[code] || { icon: "🌡️", label: "" };

const WeatherWidget = ({ locationName }) => {
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(HIDDEN_STORAGE_KEY) === "true",
  );
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = useCallback(async (city) => {
    const cacheKey = `weatherWidgetCache:v2:${city.toLowerCase()}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setWeather(cached.data);
        return;
      }
    } catch {
      // ignore malformed cache entry
    }

    setLoading(true);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
      );
      const geoData = await geoRes.json();
      const place = geoData?.results?.[0];
      if (!place) {
        setWeather(null);
        return;
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m&timezone=auto`,
      );
      const weatherData = await weatherRes.json();
      const current = weatherData?.current;
      if (!current) {
        setWeather(null);
        return;
      }

      const result = {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        code: current.weather_code,
        cityLabel: place.name,
      };
      setWeather(result);
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ data: result, timestamp: Date.now() }),
      );
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hidden || !locationName) return;
    fetchWeather(locationName);
  }, [hidden, locationName, fetchWeather]);

  const handleHide = () => {
    setHidden(true);
    localStorage.setItem(HIDDEN_STORAGE_KEY, "true");
  };

  const handleShow = () => {
    setHidden(false);
    localStorage.removeItem(HIDDEN_STORAGE_KEY);
  };

  if (hidden) {
    return createPortal(
      <button
        type="button"
        className={cx("weather-fab")}
        onClick={handleShow}
        aria-label="Show weather widget"
      >
        🌤️
      </button>,
      document.body,
    );
  }

  if (!loading && !weather) return null;

  const { icon, label } = weather ? getWeatherInfo(weather.code) : {};

  return createPortal(
    <div className={cx("weather-widget")}>
      <button
        type="button"
        className={cx("weather-widget__close")}
        onClick={handleHide}
        aria-label="Hide weather widget"
      >
        ×
      </button>
      {loading && !weather ? (
        <div className={cx("weather-widget__loading")}>Loading weather…</div>
      ) : (
        <>
          <div className={cx("weather-widget__content")}>
            <div className={cx("weather-widget__icon")}>{icon}</div>
            <div className={cx("weather-widget__info")}>
              <div className={cx("weather-widget__temp")}>
                {weather.temperature}°C
              </div>
              <div className={cx("weather-widget__meta")}>
                {label} · {weather.cityLabel}
              </div>
            </div>
          </div>
          <div className={cx("weather-widget__details")}>
            <span>Feels {weather.feelsLike}°C</span>
            <span>Humidity {weather.humidity}%</span>
            <span>Wind {weather.windSpeed} km/h</span>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
};

export default WeatherWidget;
