'use client'

import { GoogleMap, Marker, DirectionsRenderer, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useState, useEffect, useCallback, useRef } from 'react';
import { addSeconds, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Zap, ExternalLink, TrendingDown, Info, GripVertical } from 'lucide-react';
import { useServerAction } from 'zsa-react';
import { saveDeliveryRoute } from '../../../_actions/save-delivery-route.action';
import { optimizeDeliveryRoute } from '../../../_actions/optimize-delivery-route.action';
import { toast } from 'sonner';
import { generateGoogleMapsRouteUrl } from '@/utils/google-maps';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  deliveryDate: string; // ISO date "2024-10-26"
  startTime?: string; // "09:00:00"
  stopDuration?: number; // seconds, default 300 (5 min)
}

// Sortable Stop Item Component
function SortableStopItem({ delivery, segment, index, stopDuration, onClick }: {
  delivery: DeliveryStop;
  segment: RouteSegment;
  index: number;
  stopDuration: number;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: delivery.orderId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="text-sm p-2 border rounded hover:bg-muted cursor-pointer flex items-center gap-2"
      onClick={onClick}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <div>
            <span className="font-semibold">Stop {index + 1}:</span> {delivery.customerName}
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
    </div>
  );
}

export function DeliveryMapView({
  deliveries,
  depotAddress,
  deliveryDate,
  startTime = "09:00:00",
  stopDuration = 300
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [orderedDeliveries, setOrderedDeliveries] = useState<DeliveryStop[]>(deliveries);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<DeliveryStop[]>(deliveries);
  const [optimizationSavings, setOptimizationSavings] = useState<{
    distanceSaved: number;
    timeSaved: number;
  } | null>(null);
  const isCalculatingRef = useRef(false);

  const { execute: saveRoute, isPending: isSaving } = useServerAction(saveDeliveryRoute);
  const { execute: optimizeRoute, isPending: isOptimizing } = useServerAction(optimizeDeliveryRoute);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder stops
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = orderedDeliveries.findIndex(d => d.orderId === active.id);
    const newIndex = orderedDeliveries.findIndex(d => d.orderId === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(orderedDeliveries, oldIndex, newIndex);
      setOrderedDeliveries(reordered);
      setHasUnsavedChanges(true);
      toast.info('Route reordered - click Save to persist changes');
    }
  };

  // Calculate route and segment times when deliveries change
  const calculateRoute = useCallback(() => {
    if (!orderedDeliveries.length || !map || !isLoaded) return;

    isCalculatingRef.current = true;
    const directionsService = new google.maps.DirectionsService();

    // Start from bakery/depot, visit all deliveries, return to depot
    const waypoints = orderedDeliveries.map(d => ({
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
          if (index >= orderedDeliveries.length) return;

          // Add drive time to current time
          const arrivalTime = addSeconds(currentTime, leg.duration?.value || 0);
          const departureTime = addSeconds(arrivalTime, stopDuration);

          calculatedSegments.push({
            orderId: orderedDeliveries[index].orderId,
            estimatedArrival: format(arrivalTime, 'HH:mm:ss'),
            estimatedDeparture: format(departureTime, 'HH:mm:ss'),
            durationFromPrevious: leg.duration?.value || 0,
            distanceFromPrevious: leg.distance?.value || 0,
          });

          // Update current time for next leg
          currentTime = departureTime;
        });

        setSegments(calculatedSegments);

        // Reset flag after calculation completes
        setTimeout(() => {
          isCalculatingRef.current = false;
        }, 100);
      }
    });
  }, [orderedDeliveries, map, depotAddress, startTime, stopDuration, isLoaded]);

  // Call calculateRoute when ordered deliveries change
  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  // Handle directions drag end - reorder deliveries based on new waypoint order
  const handleDirectionsDragEnd = useCallback(() => {
    // Ignore if we're in the middle of calculating a route
    if (isCalculatingRef.current) return;

    if (!directionsRenderer) return;

    const currentDirections = directionsRenderer.getDirections();
    if (!currentDirections) return;

    const route = currentDirections.routes[0];
    if (!route || !route.waypoint_order) return;

    // Check if the order actually changed
    const hasOrderChanged = route.waypoint_order.some((newIndex, i) => newIndex !== i);
    if (!hasOrderChanged) return;

    // Reorder deliveries based on Google's waypoint_order
    const newOrder = route.waypoint_order.map(index => orderedDeliveries[index]);
    setOrderedDeliveries(newOrder);
    setHasUnsavedChanges(true);

    toast.info('Route reordered - click Save to persist changes');
  }, [directionsRenderer, orderedDeliveries]);

  // Save route to database
  const handleSaveRoute = async () => {
    try {
      const [data, err] = await saveRoute({
        deliveryDate,
        routeSegments: segments.map((seg, idx) => ({
          orderId: seg.orderId,
          sequence: idx,
          estimatedArrival: seg.estimatedArrival,
          durationFromPrevious: seg.durationFromPrevious,
          distanceFromPrevious: seg.distanceFromPrevious,
        })),
      });

      if (err) {
        toast.error('Failed to save route: ' + err.message);
        return;
      }

      setHasUnsavedChanges(false);
      setOriginalOrder(orderedDeliveries);
      toast.success(`Route saved! Updated ${data.updatedCount} deliveries.`);
    } catch (error) {
      toast.error('Failed to save route');
      console.error(error);
    }
  };

  // Revert to original order
  const handleRevertRoute = () => {
    setOrderedDeliveries(originalOrder);
    setHasUnsavedChanges(false);
    setOptimizationSavings(null);
    toast.info('Route reverted to original order');
  };

  // Optimize route using Google Directions API
  const handleOptimizeRoute = async () => {
    try {
      const [data, err] = await optimizeRoute({
        deliveries: orderedDeliveries,
        depotAddress,
        startTime,
        stopDuration,
      });

      if (err) {
        toast.error('Failed to optimize route: ' + err.message);
        return;
      }

      if (!data) {
        toast.error('No optimization data returned');
        return;
      }

      console.log('Optimization result:', {
        optimizedDeliveries: data.optimizedDeliveries,
        segments: data.segments,
        deliveriesCount: data.optimizedDeliveries?.length,
        segmentsCount: data.segments?.length,
      });

      // Update state with optimized data
      setOrderedDeliveries(data.optimizedDeliveries);
      setSegments(data.segments); // ✅ Set segments from server to avoid waiting for useEffect
      setOptimizationSavings(data.savings);
      setHasUnsavedChanges(true);

      // Show savings message
      const distanceSavedMiles = (data.savings.distanceSaved / 1609.34).toFixed(1);
      const timeSavedMinutes = (data.savings.timeSaved / 60).toFixed(0);

      if (data.savings.distanceSaved > 0 || data.savings.timeSaved > 0) {
        toast.success(
          `Route optimized! Saved ${distanceSavedMiles} mi and ${timeSavedMinutes} min`,
          { duration: 5000 }
        );
      } else {
        toast.info('Route is already optimal');
      }
    } catch (error) {
      toast.error('Failed to optimize route');
      console.error(error);
    }
  };

  // Open route in Google Maps
  const handleOpenInGoogleMaps = () => {
    const url = generateGoogleMapsRouteUrl(orderedDeliveries, depotAddress);
    if (url) {
      window.open(url, '_blank');
      toast.success('Route opened in Google Maps');
    } else {
      toast.error('No deliveries to navigate');
    }
  };

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
      {/* Route Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Delivery Route</h3>
          {hasUnsavedChanges && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInGoogleMaps}
            disabled={orderedDeliveries.length === 0}
            title="Open route in Google Maps for navigation"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in Maps
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevertRoute}
            disabled={!hasUnsavedChanges}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Revert
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || orderedDeliveries.length < 2}
            title="Auto-optimize route for shortest distance"
          >
            <Zap className="h-4 w-4 mr-1" />
            {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveRoute}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Route'}
          </Button>
        </div>
      </div>

      {/* How to use alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>How to adjust route:</strong> Drag stops in the timeline below, drag waypoints on the map, or click &ldquo;Optimize Route&rdquo; for automatic optimization.
        </AlertDescription>
      </Alert>

      {/* Optimization Savings Alert */}
      {optimizationSavings && (optimizationSavings.distanceSaved > 0 || optimizationSavings.timeSaved > 0) && (
        <Alert className="bg-green-50 border-green-200">
          <TrendingDown className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Route optimized!</strong> Saved{' '}
            <strong>{(optimizationSavings.distanceSaved / 1609.34).toFixed(1)} miles</strong> and{' '}
            <strong>{(optimizationSavings.timeSaved / 60).toFixed(0)} minutes</strong> compared to original route.
          </AlertDescription>
        </Alert>
      )}

      {/* Route Summary */}
      <div className="bg-muted p-4 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Start Time</div>
            <div className="font-semibold">{startTime}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Stops</div>
            <div className="font-semibold">{orderedDeliveries.length}</div>
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
                draggable: true, // Enable drag-and-drop reordering
                polylineOptions: {
                  strokeColor: '#2563eb',
                  strokeWeight: 4,
                  strokeOpacity: 0.7,
                },
              }}
              onLoad={setDirectionsRenderer}
              onDirectionsChanged={handleDirectionsDragEnd}
            />
          )}

          {/* Custom markers with arrival times */}
          {orderedDeliveries.map((delivery, index) => (
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
                lat: orderedDeliveries[selectedStop].lat,
                lng: orderedDeliveries[selectedStop].lng
              }}
              onCloseClick={() => setSelectedStop(null)}
            >
              <div className="p-2">
                <div className="font-semibold">{orderedDeliveries[selectedStop].customerName}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {orderedDeliveries[selectedStop].address.street}
                </div>
                <div className="text-sm text-gray-600">
                  {orderedDeliveries[selectedStop].address.city}, {orderedDeliveries[selectedStop].address.state} {orderedDeliveries[selectedStop].address.zip}
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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Route Timeline</h3>
          <p className="text-xs text-muted-foreground">
            🎯 Drag stops below to reorder route
          </p>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-1">
            <div className="text-sm p-2 bg-muted rounded">
              <span className="font-mono">{startTime}</span> - Start from {depotAddress.name}
            </div>
            <SortableContext
              items={orderedDeliveries.map(d => d.orderId)}
              strategy={verticalListSortingStrategy}
            >
              {segments.map((segment, index) => {
                const delivery = orderedDeliveries[index];
                if (!delivery) return null;

                return (
                  <SortableStopItem
                    key={delivery.orderId}
                    delivery={delivery}
                    segment={segment}
                    index={index}
                    stopDuration={stopDuration}
                    onClick={() => setSelectedStop(index)}
                  />
                );
              })}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
