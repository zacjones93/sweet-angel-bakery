'use client'

import { GoogleMap, Marker, DirectionsRenderer, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useState, useEffect } from 'react';
import { addSeconds, format } from 'date-fns';

interface DeliveryStop {
  orderId: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  lat: number;
  lng: number;
  customerName: string;
  timeWindow?: string;
  estimatedArrival?: string; // "09:15:00"
}

interface RouteSegment {
  orderId: string;
  estimatedArrival: string;
  estimatedDeparture: string;
  durationFromPrevious: number;
  distanceFromPrevious: number;
}

interface Props {
  deliveries: DeliveryStop[];
  depotAddress: {
    lat: number;
    lng: number;
    name: string; // "Sweet Angel Bakery"
  };
  startTime?: string; // "09:00:00"
  stopDuration?: number; // seconds, default 300 (5 min)
}

export function DeliveryMapView({
  deliveries,
  depotAddress,
  startTime = "09:00:00",
  stopDuration = 300
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);

  // Calculate route and segment times when deliveries change
  useEffect(() => {
    if (!deliveries.length || !map || !isLoaded) return;

    const directionsService = new google.maps.DirectionsService();

    // Start from bakery/depot, visit all deliveries, return to depot
    const waypoints = deliveries.map(d => ({
      location: { lat: d.lat, lng: d.lng },
      stopover: true,
    }));

    directionsService.route({
      origin: { lat: depotAddress.lat, lng: depotAddress.lng },
      destination: { lat: depotAddress.lat, lng: depotAddress.lng }, // Return to depot
      waypoints,
      optimizeWaypoints: false, // Manual optimization
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK' && result) {
        setDirections(result);

        // Extract segment times from directions
        const legs = result.routes[0].legs;
        const calculatedSegments: RouteSegment[] = [];

        // Parse start time
        const [hours, minutes] = startTime.split(':').map(Number);
        let currentTime = new Date();
        currentTime.setHours(hours, minutes, 0, 0);

        legs.forEach((leg, index) => {
          // Skip the last leg (return to depot)
          if (index >= deliveries.length) return;

          // Add drive time to current time
          const arrivalTime = addSeconds(currentTime, leg.duration?.value || 0);
          const departureTime = addSeconds(arrivalTime, stopDuration);

          calculatedSegments.push({
            orderId: deliveries[index].orderId,
            estimatedArrival: format(arrivalTime, 'HH:mm:ss'),
            estimatedDeparture: format(departureTime, 'HH:mm:ss'),
            durationFromPrevious: leg.duration?.value || 0,
            distanceFromPrevious: leg.distance?.value || 0,
          });

          // Update current time for next leg
          currentTime = departureTime;
        });

        setSegments(calculatedSegments);
      }
    });
  }, [deliveries, map, depotAddress, startTime, stopDuration, isLoaded]);

  if (loadError) {
    return <div className="text-destructive">Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div className="text-muted-foreground">Loading maps...</div>;
  }

  if (deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No deliveries to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <div className="bg-muted p-4 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Start Time</div>
            <div className="font-semibold">{startTime}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Stops</div>
            <div className="font-semibold">{deliveries.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Distance</div>
            <div className="font-semibold">
              {directions ?
                `${(directions.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1609.34).toFixed(1)} mi`
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Est. Completion</div>
            <div className="font-semibold">
              {segments.length > 0 ? segments[segments.length - 1].estimatedDeparture : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[600px] w-full rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={depotAddress}
          zoom={12}
          onLoad={setMap}
        >
          {/* Depot Marker */}
          <Marker
            position={depotAddress}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4CAF50',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title={depotAddress.name}
          />

          {/* Route with directions */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true, // We'll add custom markers
                polylineOptions: {
                  strokeColor: '#2563eb',
                  strokeWeight: 4,
                  strokeOpacity: 0.7,
                },
              }}
            />
          )}

          {/* Custom markers with arrival times */}
          {deliveries.map((delivery, index) => (
            <Marker
              key={delivery.orderId}
              position={{ lat: delivery.lat, lng: delivery.lng }}
              label={{
                text: `${index + 1}`,
                color: 'white',
                fontWeight: 'bold',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 15,
                fillColor: '#dc2626',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              onClick={() => setSelectedStop(index)}
            />
          ))}

          {/* Info window showing arrival time */}
          {selectedStop !== null && segments[selectedStop] && (
            <InfoWindow
              position={{
                lat: deliveries[selectedStop].lat,
                lng: deliveries[selectedStop].lng
              }}
              onCloseClick={() => setSelectedStop(null)}
            >
              <div className="p-2">
                <div className="font-semibold">{deliveries[selectedStop].customerName}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {deliveries[selectedStop].address.street}
                </div>
                <div className="text-sm text-gray-600">
                  {deliveries[selectedStop].address.city}, {deliveries[selectedStop].address.state} {deliveries[selectedStop].address.zip}
                </div>
                <div className="text-sm text-gray-900 mt-2 font-medium">
                  Arrival: {segments[selectedStop].estimatedArrival}
                </div>
                <div className="text-sm text-gray-600">
                  Departure: {segments[selectedStop].estimatedDeparture}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(segments[selectedStop].durationFromPrevious / 60).toFixed(0)} min drive
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Segment Details List */}
      <div className="space-y-2">
        <h3 className="font-semibold">Route Timeline</h3>
        <div className="space-y-1">
          <div className="text-sm p-2 bg-muted rounded">
            <span className="font-mono">{startTime}</span> - Start from {depotAddress.name}
          </div>
          {segments.map((segment, index) => (
            <div key={segment.orderId} className="text-sm p-2 border rounded hover:bg-muted cursor-pointer" onClick={() => setSelectedStop(index)}>
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">Stop {index + 1}:</span> {deliveries[index].customerName}
                </div>
                <div className="font-mono text-muted-foreground">
                  {segment.estimatedArrival} - {segment.estimatedDeparture}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(segment.durationFromPrevious / 60).toFixed(0)} min drive ·
                {' '}{(segment.distanceFromPrevious / 1609.34).toFixed(1)} mi ·
                {' '}{stopDuration / 60} min stop
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
