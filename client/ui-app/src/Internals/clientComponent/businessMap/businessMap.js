import { GoogleMap, Marker, LoadScript } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "14px",
};

export default function BusinessMap({ lat, lng, name }) {
  if (!lat || !lng) return null;

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat, lng }}
        zoom={15}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        <Marker
          position={{ lat, lng }}
          title={name}
        />
      </GoogleMap>
    </LoadScript>
  );
}
