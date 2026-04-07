import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config(); // Loads .env

export const fetchGeoLocation = async (ip) => {
  try {
    const isLocal = ip === "::1" || ip === "127.0.0.1";
    const url = isLocal
      ? `https://ipapi.co/json/` 
      : `https://ipapi.co/${ip}/json/`;

    const response = await fetch(url);
    const data = await response.json();


    if (data.error) {
      console.error("Geo API error:", data.reason || data.message);
      return {
        ip: ip,
        city: "Unknown",
        region: "Unknown",
        country_name: "Unknown",
        latitude: null,
        longitude: null,
      };
    }

    return {
      ip: data.ip || ip,
      city: data.city || "Unknown",
      region: data.region || "Unknown",
      country_name: data.country_name || "Unknown",
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    };
  } catch (error) {
    console.error("Geo API fetch error:", error.message);
    return {
      ip,
      city: "Unknown",
      region: "Unknown",
      country_name: "Unknown",
      latitude: null,
      longitude: null,
    };
  }
};
