# Delivery Route Planner with Drag-and-Drop Optimization

## Executive Summary

This document outlines an implementation plan for adding an interactive delivery route planner to the fulfillment page. The feature will allow admins to visualize all deliveries for a selected day on a map, drag stops to reorder them, and see the route update in real-time.

## Research: Industry Best Practices

### Top Delivery Route Planner Apps (2025)

Based on research into leading route optimization platforms, here are the key features users expect:

#### 1. **Circuit for Teams**
- Multi-stop route optimization
- Drag-and-drop to reassign/reorder stops
- Real-time driver tracking
- Time window support

#### 2. **Route4Me**
- Route optimization in <1 minute
- Easy resequencing of routes
- Integration with Google Maps/Waze
- Real-time dispatcher updates

#### 3. **Routific**
- Visual drag-and-drop routing
- Timeline view for tracking progress
- Free for up to 100 orders/month
- Custom route adjustments

#### 4. **OptimoRoute**
- Advanced scheduling with time windows
- Return to depot functionality
- Plan ~1000 routes in minutes
- Recurring route templates

### Common Features Across Platforms

1. **Interactive Map View**: Visual representation of all stops
2. **Drag & Drop Reordering**: Manual optimization by dragging markers
3. **Automatic Route Optimization**: Algorithm-based optimal route calculation
4. **Time Windows**: Support delivery time constraints
5. **Route Lines/Polylines**: Visual path between stops
6. **Distance/Duration Display**: Real-time metrics as route changes
7. **Segment Time Estimation**: Estimated arrival time at each stop
8. **Export/Print**: Formatted route sheets for drivers

## Technology Options Analysis

### Map Libraries

#### Option 1: Google Maps JavaScript API ⭐ RECOMMENDED
**Pros:**
- Official draggable directions support built-in
- Familiar UX for most users
- Excellent documentation and React libraries
- DirectionsService API for routing
- Route Optimization API (GMPRO) available

**Cons:**
- Pricing: $7/1000 map loads, $5/1000 directions requests
- GMPRO pricing: $0.03/optimized visit (but competitive)
- Vendor lock-in

**Implementation:**
- `@googlemaps/react-wrapper` or `@react-google-maps/api`
- `google.maps.DirectionsRenderer` with `draggable: true`
- `google.maps.DirectionsService` for route calculation

#### Option 2: Mapbox GL JS
**Pros:**
- Modern, performant WebGL rendering
- Generous free tier (50K loads/month)
- Beautiful styling options
- Good React support (`react-map-gl`)

**Cons:**
- No built-in route dragging (requires custom implementation)
- Routing via Mapbox Directions API ($0.50/1000 requests)
- More complex setup for driving directions

#### Option 3: Leaflet + React-Leaflet
**Pros:**
- Completely free and open source
- Lightweight
- Plugins available: `leaflet-draggable-lines`, `leaflet-routing-machine`

**Cons:**
- More manual implementation required
- Less polished UX out-of-box
- Requires separate routing service (OSRM, GraphHopper)

### Route Optimization APIs

#### Option 1: Google Maps Platform Route Optimization API (GMPRO) ⭐ RECOMMENDED
**Pricing:** $0.03/optimized visit (5x cheaper than competitors)
**Features:**
- Solves Traveling Salesman Problem (TSP)
- Multi-vehicle support
- Time windows
- Fast optimization (<1 min for most routes)

**Use Case:** Automatic "Optimize Route" button

#### Option 2: Google Directions API (Basic Optimization)
**Pricing:** $5/1000 requests
**Features:**
- `optimizeWaypoints: true` flag
- Limited to 25 waypoints max
- Basic TSP solving

**Use Case:** Good for most bakery delivery days

#### Option 3: Self-Hosted Open Source
**Options:**
- **OSRM** (Open Source Routing Machine) - Fast, free
- **GraphHopper** - Route Optimization API based on jsprit
- **Vroom** - Pluggable routing (works with OSRM/GraphHopper)

**Pros:**
- No per-request costs
- Complete control
- Privacy

**Cons:**
- Hosting/maintenance overhead
- Requires OpenStreetMap data
- Setup complexity

## Recommended Architecture

### Phase 1: Map Visualization (MVP)
Build basic map view showing all deliveries for selected day

**Components:**
- `DeliveryMapView` - Main map container
- `DeliveryMarker` - Individual stop marker
- `RoutePolyline` - Line connecting stops

**Features:**
- Display all delivery addresses as markers
- Show route line connecting stops in current order
- Start from admin's/bakery's address (depot)
- Click marker to see order details with estimated arrival time
- Total distance/duration display
- **Segment timing**: Show estimated arrival/departure at each stop
- Route timeline view with drive times between stops

### Phase 2: Drag & Drop Reordering
Add manual route adjustment

**Features:**
- Draggable markers (hold and drag to reorder)
- Route line updates on drag
- Distance/duration recalculates
- **Segment times auto-update** when route changes
- Save reordered sequence with timing to database

### Phase 3: Route Optimization
Add "Optimize Route" button

**Features:**
- One-click optimal route calculation
- Before/after comparison (time/distance saved)
- Option to revert to manual order

### Phase 4: Advanced Features (Future)
- Multi-day route planning
- Driver assignment
- Time window constraints
- Print formatted route sheets
- Export to driver mobile apps
- Real-time tracking integration

## Implementation Plan

### Database Schema Changes

Add `delivery_route` table to track optimized delivery order with segment timing:

```sql
CREATE TABLE delivery_route (
  id TEXT PRIMARY KEY, -- drt_*
  delivery_date TEXT NOT NULL, -- ISO date "2024-10-26"
  route_segments TEXT NOT NULL, -- JSON array of route segments with timing
  total_distance INTEGER, -- meters
  total_duration INTEGER, -- seconds
  optimization_method TEXT, -- 'manual' | 'auto' | 'algorithm'
  start_time TEXT, -- ISO time "09:00:00" - when route begins
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT, -- userId who created/optimized

  INDEX(delivery_date)
);
```

**Route Segments JSON Structure:**
```json
{
  "segments": [
    {
      "orderId": "ord_xyz123",
      "sequence": 0,
      "estimatedArrival": "09:15:00",
      "estimatedDeparture": "09:20:00",
      "durationFromPrevious": 900, // seconds (15 min drive)
      "distanceFromPrevious": 8500, // meters
      "stopDuration": 300 // seconds (5 min at stop)
    },
    {
      "orderId": "ord_abc456",
      "sequence": 1,
      "estimatedArrival": "09:32:00",
      "estimatedDeparture": "09:37:00",
      "durationFromPrevious": 720, // 12 min drive
      "distanceFromPrevious": 5200,
      "stopDuration": 300
    }
  ]
}
```

**Alternative (Simpler):** Add columns to `order` table
- `delivery_sequence` - INT for sort order (0, 1, 2, 3...)
- `estimated_arrival_time` - TEXT for arrival time
- `route_duration_from_previous` - INT for segment duration
- Reset daily or per-route

### Component Architecture

```
src/app/(admin)/admin/orders/fulfillment/
├── page.tsx (existing)
└── _components/
    ├── delivery-map-view.tsx (NEW)
    │   ├── Map container
    │   ├── Date selector integration
    │   └── Toggle view: list/map
    ├── delivery-map-marker.tsx (NEW)
    │   ├── Draggable marker component
    │   ├── Order info popup with arrival time
    │   └── Drag event handlers
    ├── delivery-route-line.tsx (NEW)
    │   ├── Polyline/route path
    │   ├── Distance/duration display
    │   └── Segment time labels
    ├── route-optimizer-controls.tsx (NEW)
    │   ├── "Optimize Route" button
    │   ├── Route statistics
    │   └── Save/Revert buttons
    └── delivery-route-sheet.tsx (NEW)
        ├── Printable route sheet
        └── Export to PDF/CSV
```

### Server Actions

```typescript
src/app/(admin)/admin/_actions/
├── save-delivery-route.action.ts (NEW)
│   └── Save optimized route sequence
├── optimize-route.action.ts (NEW)
│   └── Call Google Route Optimization API
├── get-delivery-route.action.ts (NEW)
│   └── Load saved route for date
└── calculate-route-metrics.action.ts (NEW)
    └── Calculate distance/duration for route
```

### State Management

Use Zustand store for map state:

```typescript
// src/state/delivery-route.ts
interface RouteSegment {
  orderId: string;
  sequence: number;
  estimatedArrival: string; // "09:15:00"
  estimatedDeparture: string; // "09:20:00"
  durationFromPrevious: number; // seconds
  distanceFromPrevious: number; // meters
  stopDuration: number; // seconds (time spent at delivery)
}

interface DeliveryRouteState {
  deliveries: DeliveryStop[];
  routeSegments: RouteSegment[];
  startTime: string; // "09:00:00" - when route begins
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedEndTime: string; // "12:30:00" - when route completes
  isDragging: boolean;
  hasUnsavedChanges: boolean;

  // Actions
  setDeliveries: (deliveries: DeliveryStop[]) => void;
  setStartTime: (time: string) => void;
  setStopDuration: (duration: number) => void; // default time per stop
  reorderStop: (fromIndex: number, toIndex: number) => void;
  recalculateSegmentTimes: () => void; // Update all arrival/departure times
  optimizeRoute: () => Promise<void>;
  saveRoute: () => Promise<void>;
  resetRoute: () => void;
}
```

### Time Estimation Methodology

**Segment Time Calculation:**

Each route segment time is calculated based on:

1. **Drive Time**: From Google Directions API
   - `directions.routes[0].legs[n].duration.value` (seconds)
   - Includes traffic estimates if available
   - Updates when route is reordered

2. **Stop Duration**: Configurable time at each delivery
   - Default: 5 minutes (300 seconds)
   - Can be customized per order (large deliveries = more time)
   - Includes: parking, walking to door, delivery, signature

3. **Buffer Time**: Optional padding between stops
   - Accounts for unexpected delays
   - Typical: 2-3 minutes per stop
   - Configurable in settings

**Arrival Time Calculation:**

```typescript
// Start at depot at 9:00 AM
startTime = "09:00:00"

// Stop 1
arrivalTime[0] = startTime + driveTime[0]  // 09:00:00 + 15min = 09:15:00
departureTime[0] = arrivalTime[0] + stopDuration  // 09:15:00 + 5min = 09:20:00

// Stop 2
arrivalTime[1] = departureTime[0] + driveTime[1]  // 09:20:00 + 12min = 09:32:00
departureTime[1] = arrivalTime[1] + stopDuration  // 09:32:00 + 5min = 09:37:00

// And so on...
```

**UI Display:**

- **Map Markers**: Show estimated arrival time on hover/click
- **Route List**: Display time windows for each stop
- **Summary**: Total route time, estimated completion
- **Color Coding**: Late deliveries (vs. customer time windows) in red

**Recalculation Triggers:**

- Route reordering (drag-and-drop)
- Start time change
- Stop duration change
- Traffic updates (if using real-time API)

## Implementation Steps (Phase 1)

### Step 1: Add Google Maps Dependencies
```bash
pnpm add @react-google-maps/api
pnpm add -D @types/google.maps
```

### Step 2: Environment Variables
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

Enable APIs in Google Cloud Console:
- Maps JavaScript API
- Directions API
- (Later) Route Optimization API

### Step 3: Create Map View Component

```tsx
// src/app/(admin)/admin/orders/fulfillment/_components/delivery-map-view.tsx
'use client'

import { GoogleMap, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
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
  timeWindow: string;
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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);

  // Calculate route and segment times when deliveries change
  useEffect(() => {
    if (!deliveries.length || !map) return;

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
  }, [deliveries, map, depotAddress, startTime, stopDuration]);

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
            label="🏪"
            title={depotAddress.name}
          />

          {/* Route with directions */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,
                draggable: true,
              }}
            />
          )}

          {/* Custom markers with arrival times */}
          {deliveries.map((delivery, index) => (
            <Marker
              key={delivery.orderId}
              position={{ lat: delivery.lat, lng: delivery.lng }}
              label={`${index + 1}`}
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
                <div className="text-sm text-muted-foreground">
                  Arrival: {segments[selectedStop].estimatedArrival}
                </div>
                <div className="text-sm text-muted-foreground">
                  Departure: {segments[selectedStop].estimatedDeparture}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
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
            <div key={segment.orderId} className="text-sm p-2 border rounded">
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">Stop {index + 1}:</span> {deliveries[index].customerName}
                </div>
                <div className="font-mono text-muted-foreground">
                  {segment.estimatedArrival} - {segment.estimatedDeparture}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {(segment.durationFromPrevious / 60).toFixed(0)} min drive ·
                {(segment.distanceFromPrevious / 1609.34).toFixed(1)} mi ·
                {stopDuration / 60} min stop
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Geocode Delivery Addresses

Create action to geocode addresses to lat/lng:

```typescript
// src/app/(admin)/admin/_actions/geocode-delivery-addresses.action.ts
'use server'

import { createServerAction } from 'zsa';
import { z } from 'zod';

export const geocodeDeliveryAddresses = createServerAction()
  .input(z.object({
    addresses: z.array(z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    })),
  }))
  .handler(async ({ input }) => {
    const geocodeResults = await Promise.all(
      input.addresses.map(async (address) => {
        const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;

        // Option 1: Use Google Geocoding API (server-side)
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        const data = await response.json();

        if (data.results?.[0]) {
          return {
            ...address,
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng,
          };
        }

        return null;
      })
    );

    return geocodeResults.filter(Boolean);
  });
```

### Step 5: Integrate Map into Fulfillment Page

Update `page.tsx` to include map view with depot address:

```tsx
// Add to existing fulfillment/page.tsx

import { DeliveryMapView } from './_components/delivery-map-view';
import { getSessionFromCookie } from '@/utils/auth';

// In the component, after fetching deliveries:
const geocodedDeliveries = await geocodeDeliveryAddresses({
  addresses: deliveries.map(d => JSON.parse(d.order.deliveryAddressJson))
});

// Get admin's delivery address as depot/starting point
const session = await getSessionFromCookie();
const user = session?.user;

// Use admin's saved delivery address or bakery default
const depotAddress = user?.streetAddress1
  ? {
      street: user.streetAddress1,
      city: user.city || 'Boise',
      state: user.state || 'ID',
      zip: user.zipCode || '83702',
    }
  : {
      // Default bakery location
      street: '123 Main St',
      city: 'Boise',
      state: 'ID',
      zip: '83702',
    };

// Geocode depot address
const [geocodedDepot] = await geocodeDeliveryAddresses({
  addresses: [depotAddress]
});

const depot = geocodedDepot || {
  lat: 43.6187,
  lng: -116.2146,
  name: 'Sweet Angel Bakery',
};

// Add toggle for map/list view
<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">List View</TabsTrigger>
    <TabsTrigger value="map">Map View</TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    {/* Existing list view */}
  </TabsContent>

  <TabsContent value="map">
    <DeliveryMapView
      deliveries={geocodedDeliveries}
      depotAddress={depot}
      startTime="09:00:00"
      stopDuration={300} // 5 minutes per stop
    />
  </TabsContent>
</Tabs>
```

**Configuration Options:**

You may want to create admin settings for:
- Default start time (9:00 AM, 10:00 AM, etc.)
- Average stop duration (5 min, 10 min)
- Depot/bakery address override
- Return to depot vs. end at last stop

## Cost Analysis

### Google Maps Platform Pricing (Pay-as-you-go)

**Phase 1 (Basic Map + Routing):**
- Map loads: $7/1000 loads
- Directions API: $5/1000 requests
- Geocoding API: $5/1000 requests

**Estimated Monthly Cost (Small Bakery):**
- ~20 delivery days/month
- Admin views map 3x per day = 60 map loads/month
- 1 directions request per view = 60 requests/month
- **Total: ~$0.42/month + $0.30/month = $0.72/month**

**Phase 3 (Route Optimization):**
- GMPRO: $0.03/optimized visit
- Average 10 deliveries/day × 20 days = 200 visits/month
- **Total: $6/month additional**

**Free Tier:**
- Google offers $200/month free credit
- This implementation would be FREE for most small bakeries

### Alternative: Self-Hosted OSRM
**Costs:**
- Cloudflare Workers CPU time (minimal)
- OSRM Docker container hosting (if needed)
- OpenStreetMap data (free)

**Trade-offs:**
- No per-request costs
- Setup/maintenance time
- Less polished UX

## User Experience Flow

### Admin Workflow

1. **Navigate to Fulfillment Page**
   - Admin selects delivery date from filters
   - Clicks "Map View" tab

2. **View Deliveries on Map**
   - All stops shown as numbered markers starting from bakery/depot
   - Route line connects stops in current order
   - Route summary shows: start time, total stops, total distance, estimated completion time
   - Click marker to see popup with:
     - Customer name
     - Estimated arrival time (e.g., "09:15:00")
     - Estimated departure time
     - Drive time from previous stop
   - Timeline view below map lists all stops with segment details:
     - Stop sequence and customer
     - Arrival - Departure time window
     - Drive time, distance, stop duration

3. **Manual Reordering** (Phase 2)
   - Drag marker #3 to position #1
   - Route line animates to show new path
   - Distance/duration updates in real-time
   - **All segment times recalculate automatically**
   - Timeline view updates with new arrival/departure times
   - "Save Route" button appears

4. **Automatic Optimization** (Phase 3)
   - Click "Optimize Route" button
   - Loading indicator (~2-5 seconds)
   - Map updates with optimized path
   - Shows "Saved 15 minutes and 3.2 miles"
   - Option to revert

5. **Export Route**
   - Click "Print Route Sheet"
   - Opens formatted document with:
     - Stop sequence with addresses
     - **Estimated arrival/departure times for each stop**
     - Drive time and distance between stops
     - Customer names/phones
     - Order details and items

## Next Steps

### Immediate Actions

1. **Enable Google Maps API**
   - Create/configure Google Cloud project
   - Enable Maps JavaScript API
   - Enable Geocoding API
   - Enable Directions API
   - Generate API key with restrictions

2. **Prototype Phase 1**
   - Install dependencies
   - Create basic map component
   - Integrate with existing fulfillment page
   - Test with real delivery data

3. **User Testing**
   - Get feedback from bakery staff
   - Refine UX based on actual workflow
   - Identify must-have vs nice-to-have features

### Future Considerations

- **Mobile Driver App**: Export routes to driver phones
- **Live Tracking**: Real-time delivery status updates
- **Customer Notifications**: SMS when driver is 10 min away
- **Route History**: Compare actual vs planned routes
- **Multi-Vehicle**: Split routes across multiple drivers
- **Integration**: Connect with delivery partner APIs (if needed)

## Alternatives Considered

### Option A: Use Existing Route Planner Service
**Services:** Circuit for Teams, Routific, OnFleet

**Pros:**
- Ready-made solution
- Mobile apps included
- Support/updates

**Cons:**
- $40-200/month per driver
- Less customization
- External dependency

### Option B: Simple List with Google Maps Links
**Current State:** Individual "Get Directions" buttons

**Pros:**
- Already implemented
- Zero cost
- Simple

**Cons:**
- No route visualization
- No optimization
- Manual order planning

### Option C: Custom Map with Open Source Stack
**Stack:** Leaflet + OSRM + Custom routing

**Pros:**
- Full control
- No API costs
- Learning opportunity

**Cons:**
- High development time
- Maintenance burden
- Hosting complexity

## Recommendation

**Start with Phase 1 using Google Maps API:**

1. Low cost (free tier sufficient)
2. Fast implementation
3. Professional UX
4. Easy to extend
5. Familiar for users

**Evaluate after 3 months:**
- If route optimization becomes essential → Add GMPRO
- If costs become concern → Evaluate open source
- If feature needs grow → Consider commercial platform

---

## Appendix: Code Examples

### Example: Draggable Markers with Reordering

```tsx
'use client'

import { useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

interface Stop {
  id: string;
  position: google.maps.LatLngLiteral;
  label: string;
}

export function DraggableRouteMap({ initialStops }: { initialStops: Stop[] }) {
  const [stops, setStops] = useState(initialStops);

  const handleMarkerDragEnd = (index: number, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const newStops = [...stops];
    newStops[index] = {
      ...newStops[index],
      position: {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      },
    };

    setStops(newStops);
    // Recalculate route here
  };

  return (
    <GoogleMap>
      {stops.map((stop, index) => (
        <Marker
          key={stop.id}
          position={stop.position}
          draggable
          label={`${index + 1}`}
          onDragEnd={(e) => handleMarkerDragEnd(index, e)}
        />
      ))}
    </GoogleMap>
  );
}
```

### Example: Route Optimization with Google GMPRO

```typescript
// Server action for route optimization
'use server'

import { createServerAction } from 'zsa';
import { z } from 'zod';

const RouteOptimizationRequest = {
  model: {
    shipments: [
      {
        deliveries: [
          {
            arrivalLocation: {
              latitude: 43.6150,
              longitude: -116.2023,
            },
            duration: "300s", // 5 min per stop
          }
        ],
      }
    ],
    vehicles: [
      {
        startLocation: {
          latitude: 43.6187, // Bakery location
          longitude: -116.2146,
        },
        endLocation: {
          latitude: 43.6187,
          longitude: -116.2146,
        },
      }
    ],
  },
};

export const optimizeDeliveryRoute = createServerAction()
  .input(z.object({
    deliveries: z.array(z.object({
      orderId: z.string(),
      lat: z.number(),
      lng: z.number(),
    })),
  }))
  .handler(async ({ input }) => {
    const response = await fetch(
      'https://routeoptimization.googleapis.com/v1/projects/YOUR_PROJECT:optimizeTours',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GOOGLE_MAPS_API_KEY}`,
        },
        body: JSON.stringify({
          // Build request from input.deliveries
        }),
      }
    );

    const data = await response.json();
    return data;
  });
```

---

## References

- [Google Maps Draggable Directions Example](https://developers.google.com/maps/documentation/javascript/examples/directions-draggable)
- [Google Maps Platform Route Optimization API](https://developers.google.com/maps/documentation/route-optimization)
- [Circuit Route Planner Review](https://www.routific.com/blog/circuit-for-teams-route-planner-review-and-alternatives)
- [Route4Me Documentation](https://support.route4me.com/)
- [Leaflet Draggable Lines Plugin](https://github.com/FacilMap/Leaflet.DraggableLines)
- [OSRM Documentation](http://project-osrm.org/)
- [GraphHopper Route Optimization](https://www.graphhopper.com/open-source/)

---

## Implementation Status

### Phase 1: Map Visualization (MVP) ✅ COMPLETED

**Commit:** `9f87ca0` - feat: implement delivery route planner Phase 1 (map visualization)

**Implemented:**
- ✅ Google Maps JavaScript API integration
- ✅ Geocoding server action for delivery addresses
- ✅ DeliveryMapView component with route rendering
- ✅ Route timeline with segment timing (arrival/departure estimates)
- ✅ Tab-based view switcher (list/map) on fulfillment page
- ✅ Interactive markers with order details on click
- ✅ Route summary (distance, duration, completion time)
- ✅ Environment variables configuration

**Components Created:**
- `src/app/(admin)/admin/orders/fulfillment/_components/delivery-map-view.tsx`
- `src/app/(admin)/admin/orders/fulfillment/_components/delivery-view-tabs.tsx`
- `src/app/(admin)/admin/_actions/geocode-delivery-addresses.action.ts`

---

### Phase 2: Drag & Drop Reordering ✅ COMPLETED

**Commit:** `549761a` - feat: implement delivery route planner Phase 2 (drag & drop reordering)

**Implemented:**
- ✅ Draggable directions with Google Maps DirectionsRenderer
- ✅ Real-time route recalculation when stops reordered
- ✅ Automatic segment timing updates (arrival/departure)
- ✅ Unsaved changes indicator (yellow badge)
- ✅ Save route to database with sequence and timing
- ✅ Revert changes to original order
- ✅ Route controls UI (Save, Revert, Optimize placeholder)
- ✅ Toast notifications for user feedback

**Database Schema:**
- Migration: `0020_add_delivery_route_optimization_fields.sql`
- Added to `order` table:
  - `deliverySequence` - INTEGER (0, 1, 2, 3...)
  - `estimatedArrivalTime` - TEXT ("09:15:00")
  - `routeDurationFromPrevious` - INTEGER (seconds)
  - `routeDistanceFromPrevious` - INTEGER (meters)

**Server Actions:**
- `src/app/(admin)/admin/_actions/save-delivery-route.action.ts`
- `src/app/(admin)/admin/_actions/get-delivery-route.action.ts`

**Features:**
- Drag waypoints on map to manually reorder delivery stops
- Route line and markers update instantly
- Distance/duration recalculates automatically
- Timeline view updates with new arrival/departure times
- Save optimized route to database for persistence
- Revert to original order if unsatisfied with changes
- Clear visual feedback with unsaved changes badge

---

### Phase 3: Route Optimization & Export ✅ COMPLETED

**Implemented:**
- ✅ Automatic route optimization using Google Directions API
- ✅ Before/after comparison with distance and time savings
- ✅ "Open in Google Maps" export for navigation
- ✅ Drag-and-drop reordering in timeline list
- ✅ Visual feedback with optimization savings alert
- ✅ Help instructions for all adjustment methods

**New Files:**
- `src/app/(admin)/admin/_actions/optimize-delivery-route.action.ts` - Route optimization server action
- `src/utils/google-maps.ts` - Google Maps URL generation utilities
- `src/components/ui/alert.tsx` - Alert component (shadcn/ui)

**Dependencies Added:**
- `@dnd-kit/core` - Drag and drop core
- `@dnd-kit/sortable` - Sortable list functionality
- `@dnd-kit/utilities` - DnD utilities

**Features:**
- **Automatic Optimization**: One-click optimization using Google's TSP solver
  - Compares original vs optimized routes
  - Shows savings in miles and minutes
  - Green alert displays optimization results
- **Google Maps Export**: "Open in Maps" button
  - Generates URL with all waypoints (lat/lng format)
  - Opens in Google Maps app/web with full route
  - Ready for turn-by-turn navigation
- **Timeline Drag & Drop**: Reorder stops in list below map
  - Drag handle (⋮⋮) on each stop
  - Real-time route recalculation
  - Visual feedback during drag
- **Three Ways to Adjust Route**:
  1. Drag stops in timeline list
  2. Drag waypoints on map
  3. Click "Optimize Route" for automatic optimization

**Next Steps:**
- Phase 4: Advanced features (multi-day planning, driver assignment, print sheets)

---

**Document Version:** 1.3
**Created:** 2025-10-25
**Last Updated:** 2025-10-26
**Author:** Claude Code
**Status:** Phase 3 Complete - Route Optimization & Export Fully Functional
