'use client';

import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';

interface TrackingMapProps {
  latitude: number;
  longitude: number;
  originCity: string;
  destinationCity: string;
}

export default function TrackingMap({ latitude, longitude, originCity, destinationCity }: TrackingMapProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  });

  if (!isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '300px' }}
      center={{ lat: latitude, lng: longitude }}
      zoom={12}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
      }}
    >
      <MarkerF
        position={{ lat: latitude, lng: longitude }}
        icon={{
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#1A3C6E',
          fillOpacity: 1,
          strokeColor: '#FFF',
          strokeWeight: 2,
          rotation: 0,
        }}
        title={`${originCity} → ${destinationCity}`}
      />
    </GoogleMap>
  );
}
