import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import io, { Socket } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

// Type definitions
interface Location {
  lat: number;
  lng: number;
}

interface Bike {
  bikeId: string;
  currentLocation: Location | null;
  avgSpeed: number;
  batteryLevel: number;
  lastSeen: string;
  status: 'active' | 'inactive' | 'maintenance';
}

interface BikeUpdateData {
  bikeId: string;
  data: {
    location: Location;
    avgSpeed: string;
    battery: string;
  };
  timestamp: string;
}

interface BikeApiResponse {
  bikes: Bike[];
}

interface Routes {
  [bikeId: string]: [number, number][];
}

interface MapControllerProps {
  bikes: Bike[];
  followBike: string | null;
}

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bike icon
const bikeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5"/>
      <circle cx="18.5" cy="17.5" r="3.5"/>
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
      <path d="M6 18h8l2-8h3l-2 8"/>
      <path d="M6 18l-1-4h4l1 4"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: 'bike-marker'
});

// Badge component (matching the pattern from other components)
interface BadgeProps {
  children: React.ReactNode;
  color?: 'success' | 'error' | 'warning' | 'info';
  variant?: 'solid' | 'light';
  className?: string;
}

function Badge({ children, color = 'info', variant = 'light', className = '' }: BadgeProps) {
  const colorClasses = {
    success: variant === 'solid' 
      ? 'bg-green-500 text-white' 
      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    error: variant === 'solid' 
      ? 'bg-red-500 text-white' 
      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    warning: variant === 'solid' 
      ? 'bg-yellow-500 text-white' 
      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    info: variant === 'solid' 
      ? 'bg-blue-500 text-white' 
      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
}

// Component to update map view when bikes are added
const MapController: React.FC<MapControllerProps> = ({ bikes, followBike }) => {
  const map = useMap();
  
  useEffect(() => {
    if (followBike && bikes.length > 0) {
      const bike = bikes.find(b => b.bikeId === followBike);
      if (bike && bike.currentLocation) {
        map.setView([bike.currentLocation.lat, bike.currentLocation.lng], 16);
      }
    } else if (bikes.length > 0) {
      // Fit map to show all bikes
      const bounds = bikes
        .filter(bike => bike.currentLocation)
        .map(bike => [bike.currentLocation!.lat, bike.currentLocation!.lng]) as [number, number][];
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [bikes, followBike, map]);
  
  return null;
};

const BikeTrackingMap: React.FC = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [routes, setRoutes] = useState<Routes>({});
  const [isTrackingRoutes, setIsTrackingRoutes] = useState<boolean>(false);
  const [followBike, setFollowBike] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL;
    
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('bikeUpdate', (data: BikeUpdateData) => {
      console.log('Received bike update:', data);
      setLastUpdate(new Date().toLocaleTimeString());
      
      setBikes(prevBikes => {
        const existingBikeIndex = prevBikes.findIndex(bike => bike.bikeId === data.bikeId);
        
        if (existingBikeIndex !== -1) {
          const updatedBikes = [...prevBikes];
          updatedBikes[existingBikeIndex] = {
            ...updatedBikes[existingBikeIndex],
            currentLocation: data.data.location,
            avgSpeed: parseFloat(data.data.avgSpeed),
            batteryLevel: parseFloat(data.data.battery),
            lastSeen: data.timestamp
          };
          return updatedBikes;
        } else {
          const newBike: Bike = {
            bikeId: data.bikeId,
            currentLocation: data.data.location,
            avgSpeed: parseFloat(data.data.avgSpeed),
            batteryLevel: parseFloat(data.data.battery),
            lastSeen: data.timestamp,
            status: 'active'
          };
          return [...prevBikes, newBike];
        }
      });

      // Update routes if tracking is enabled
      if (isTrackingRoutes && data.data.location) {
        setRoutes(prevRoutes => {
          const bikeRoute = prevRoutes[data.bikeId] || [];
          const newPoint: [number, number] = [data.data.location.lat, data.data.location.lng];
          
          const lastPoint = bikeRoute[bikeRoute.length - 1];
          if (!lastPoint || lastPoint[0] !== newPoint[0] || lastPoint[1] !== newPoint[1]) {
            return {
              ...prevRoutes,
              [data.bikeId]: [...bikeRoute, newPoint]
            };
          }
          
          return prevRoutes;
        });
      }
    });

    fetchBikes();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isTrackingRoutes]);

  const fetchBikes = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:3001/api/bikes');
      const data: BikeApiResponse = await response.json();
      if (data.bikes) {
        setBikes(data.bikes);
      }
    } catch (error) {
      console.error('Error fetching bikes:', error);
    }
  };

  const startRouteTracking = (): void => {
    setIsTrackingRoutes(true);
    setRoutes({});
    
    bikes.forEach(bike => {
      if (bike.currentLocation) {
        setRoutes(prevRoutes => ({
          ...prevRoutes,
          [bike.bikeId]: [[bike.currentLocation!.lat, bike.currentLocation!.lng]]
        }));
      }
    });
  };

  const stopRouteTracking = (): void => {
    setIsTrackingRoutes(false);
  };

  const clearRoutes = (): void => {
    setRoutes({});
  };

  const followBikeHandler = (bikeId: string): void => {
    setFollowBike(followBike === bikeId ? null : bikeId);
  };

  const getBatteryColor = (level: number): 'success' | 'warning' | 'error' => {
    if (level > 50) return 'success';
    if (level > 20) return 'warning';
    return 'error';
  };

  const getRouteColor = (bikeId: string): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
    return colors[bikes.findIndex(b => b.bikeId === bikeId) % colors.length];
  };

  const activeBikes = bikes.filter(bike => bike.status === 'active');
  const lowBatteryBikes = bikes.filter(bike => bike.batteryLevel < 20);

  // Default center (you can change this to your preferred location)
  const defaultCenter: [number, number] = [19.0760, 72.8777]; // Mumbai coordinates

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Live Bike Tracking
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time fleet monitoring & route tracking
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <Badge color={isConnected ? 'success' : 'error'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            {lastUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updated: {lastUpdate}
              </span>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bikes.length}</div>
            <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Bikes</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeBikes.length}</div>
            <div className="text-xs text-green-700 dark:text-green-300 font-medium">Active</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{lowBatteryBikes.length}</div>
            <div className="text-xs text-red-700 dark:text-red-300 font-medium">Low Battery</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Object.keys(routes).length}</div>
            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Routes</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={isTrackingRoutes ? stopRouteTracking : startRouteTracking}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isTrackingRoutes
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
            }`}
          >
            {isTrackingRoutes ? (
              <>
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                </svg>
                Stop Tracking
              </>
            ) : (
              <>
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Route Tracking
              </>
            )}
          </button>
          
          <button
            onClick={clearRoutes}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-medium text-sm hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Routes
          </button>
          
          <button
            onClick={fetchBikes}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium text-sm hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>


        </div>
      </div>

      {/* Map Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-[400px] sm:h-[500px] lg:h-[600px] rounded-xl overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapController bikes={bikes} followBike={followBike} />
            
            {/* Bike Markers */}
            {bikes.map((bike) => (
              bike.currentLocation && (
                <Marker
                  key={bike.bikeId}
                  position={[bike.currentLocation.lat, bike.currentLocation.lng]}
                  icon={bikeIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{bike.bikeId}</h3>
                      <p className="text-sm">Speed: {bike.avgSpeed ? `${bike.avgSpeed.toFixed(1)} km/h` : 'N/A'}</p>
                      <p className="text-sm">Battery: {bike.batteryLevel ? `${bike.batteryLevel.toFixed(0)}%` : 'N/A'}</p>
                      <p className="text-sm">
                        Location: {bike.currentLocation.lat.toFixed(6)}, {bike.currentLocation.lng.toFixed(6)}
                      </p>
                      {bike.lastSeen && (
                        <p className="text-xs text-gray-500">
                          Last seen: {new Date(bike.lastSeen).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
            
            {/* Route Polylines */}
            {isTrackingRoutes && Object.entries(routes).map(([bikeId, route]) => (
              route.length > 1 && (
                <Polyline
                  key={bikeId}
                  positions={route}
                  color={getRouteColor(bikeId)}
                  weight={3}
                  opacity={0.7}
                />
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default BikeTrackingMap;