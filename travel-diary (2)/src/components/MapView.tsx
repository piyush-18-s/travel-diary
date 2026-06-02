import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';

// Fix for default marker icons in Leaflet with Webpack/Vite
import 'leaflet/dist/leaflet.css';

const createCustomIcon = (color: string = '#f97316') => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div class="marker-pulse" style="background-color: ${color}"></div>
    <div class="marker-dot" style="background-color: ${color}"></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  type?: 'destination' | 'attraction' | 'resort' | 'activity';
}

interface MapViewProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  zoom?: number;
  themeColor?: string;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const MapView: React.FC<MapViewProps> = ({ center, points, zoom = 13, themeColor = '#f97316' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="h-[400px] w-full rounded-3xl overflow-hidden glass-card z-0 relative"
    >
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={[center.lat, center.lng]} zoom={zoom} />
        {points.map((point, idx) => (
          <Marker 
            key={idx} 
            position={[point.lat, point.lng]}
            icon={createCustomIcon(themeColor)}
          >
            <Popup className="custom-popup">
              <div className="font-sans p-1">
                <span className="font-bold block text-sm text-gray-900">{point.label}</span>
                {point.type && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: themeColor }}>
                    {point.type}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </motion.div>
  );
};

export default MapView;
