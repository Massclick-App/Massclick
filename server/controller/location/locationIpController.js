import { fetchGeoLocation } from "../../helper/location/locationIpHelper.js";
import IpLocation from "../../model/locationModel/locationIpAddressModel.js";


export const getLocation = async (req, res) => {
  try {
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    const geoData = await fetchGeoLocation(ip);
    

    if (!geoData || geoData.city === "Unknown") {
      return res.status(200).json({
        success: false,
        message: "Unable to fetch location from IP",
        data: geoData,
      });
    }

    const ipDoc = new IpLocation({
      ip: geoData.ip,
      city: geoData.city,
      region: geoData.region,
      country_name: geoData.country_name,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
    });

    await ipDoc.save();

    return res.status(200).json({
      success: true,
      message: "IP location fetched successfully",
      data: geoData,
    });
  } catch (err) {
    console.error("getLocation error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



