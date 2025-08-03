// import React, { useState, useCallback, useEffect, useRef } from 'react';
// import { MapContainer, TileLayer, Circle, Marker, useMapEvents, Popup } from 'react-leaflet';
// import { Icon, LatLng } from 'leaflet';
// import { Socket, io } from 'socket.io-client';
// import 'leaflet/dist/leaflet.css';

// // Type definitions (same as before)
// interface Location {
//   lat: number;
//   lng: number;
// }

// interface BikeData {
//   location: Location;
//   avgSpeed: string;
//   battery: string;
// }

// interface BikeUpdateData {
//   bikeId: string;
//   data: BikeData;
//   timestamp: string;
//   geofencing?: {
//     isOutsideFence: boolean;
//     distanceFromBase: number;
//     geofenceId: string;
//   };
// }

// interface Bike {
//   bikeId: string;
//   currentLocation: Location;
//   avgSpeed: number;
//   batteryLevel: number;
//   lastSeen: string;
//   status: string;
//   isOutsideFence: boolean;
//   distanceFromBase: number;
// }

// interface MapClickHandlerProps {
//   onMapClick: (latlng: LatLng) => void;
// }

// interface Geofence {
//   id: string;
//   name: string;
//   baseLocation: Location;
//   radius: number;
//   isActive: boolean;
// }

// // Icon definitions (same as before)
// const defaultIcon = new Icon({
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const bikeIconGreen = new Icon({
//   iconUrl: 'data:image/svg+xml;base64,' + btoa(`
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
//       <circle cx="5.5" cy="17.5" r="3.5"/>
//       <circle cx="18.5" cy="17.5" r="3.5"/>
//       <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
//       <path d="M6 18h8l2-8h3l-2 8"/>
//       <path d="M6 18l-1-4h4l1 4"/>
//     </svg>
//   `),
//   iconSize: [32, 32],
//   iconAnchor: [16, 32],
//   popupAnchor: [0, -32],
// });

// const bikeIconRed = new Icon({
//   iconUrl: 'data:image/svg+xml;base64,' + btoa(`
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
//       <circle cx="5.5" cy="17.5" r="3.5"/>
//       <circle cx="18.5" cy="17.5" r="3.5"/>
//       <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
//       <path d="M6 18h8l2-8h3l-2 8"/>
//       <path d="M6 18l-1-4h4l1 4"/>
//     </svg>
//   `),
//   iconSize: [32, 32],
//   iconAnchor: [16, 32],
//   popupAnchor: [0, -32],
// });

// function MapClickHandler({ onMapClick }: MapClickHandlerProps): null {
//   useMapEvents({
//     click: (e) => {
//       onMapClick(e.latlng);
//     },
//   });
//   return null;
// }

// export default function GeoFencing(): JSX.Element {
//   const [baseLocation, setBaseLocation] = useState<Location>({
//     lat: 19.0760,
//     lng: 72.8777
//   });
//   const [radius, setRadius] = useState<number>(1);
//   const [bikes, setBikes] = useState<Bike[]>([]);
//   const [isConnected, setIsConnected] = useState<boolean>(false);
//   const [lastUpdate, setLastUpdate] = useState<string | null>(null);
//   const [activeGeofence, setActiveGeofence] = useState<Geofence | null>(null);
//   const [isSettingGeofence, setIsSettingGeofence] = useState<boolean>(false);
//   const socketRef = useRef<Socket | null>(null);

//   const API_BASE_URL = import.meta.env.VITE_GEOFENCE_URL || 'http://localhost:3001/api';
//   const SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

//   // Initialize socket connection
//   useEffect(() => {
//     socketRef.current = io(SERVER_URL, {
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionAttempts: 5
//     });

//     socketRef.current.on('connect', () => {
//       console.log('Connected to server');
//       setIsConnected(true);
//     });

//     socketRef.current.on('disconnect', () => {
//       console.log('Disconnected from server');
//       setIsConnected(false);
//     });

//     // Listen for bike updates from server
//     socketRef.current.on('bikeUpdate', (data: BikeUpdateData) => {
//       console.log('Received bike update:', data);
//       setLastUpdate(new Date().toLocaleTimeString());
      
//       setBikes(prevBikes => {
//         const existingBikeIndex = prevBikes.findIndex(bike => bike.bikeId === data.bikeId);
        
//         const updatedBike: Bike = {
//           bikeId: data.bikeId,
//           currentLocation: data.data.location,
//           avgSpeed: parseFloat(data.data.avgSpeed),
//           batteryLevel: parseFloat(data.data.battery),
//           lastSeen: data.timestamp,
//           status: 'active',
//           isOutsideFence: data.geofencing?.isOutsideFence || false,
//           distanceFromBase: data.geofencing?.distanceFromBase || 0
//         };

//         if (existingBikeIndex !== -1) {
//           const updatedBikes = [...prevBikes];
//           updatedBikes[existingBikeIndex] = updatedBike;
//           return updatedBikes;
//         } else {
//           return [...prevBikes, updatedBike];
//         }
//       });
//     });

//     // Listen for initial data
//     socketRef.current.on('initialBikesData', (bikesData: Bike[]) => {
//       setBikes(bikesData);
//     });

//     socketRef.current.on('activeGeofence', (geofence: Geofence) => {
//       setActiveGeofence(geofence);
//       setBaseLocation(geofence.baseLocation);
//       setRadius(geofence.radius);
//     });

//     // Listen for geofence updates
//     socketRef.current.on('geofenceUpdated', (geofence: Geofence) => {
//       setActiveGeofence(geofence);
//       setBaseLocation(geofence.baseLocation);
//       setRadius(geofence.radius);
//     });

//     // Fetch initial data
//     fetchInitialData();

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, []);

//   const fetchInitialData = async (): Promise<void> => {
//     try {
//       // Fetch active geofence
//       const geofenceResponse = await fetch(`${API_BASE_URL}/geofencing/geofence/active`);
//       if (geofenceResponse.ok) {
//         const geofenceData = await geofenceResponse.json();
//         if (geofenceData.geofence) {
//           setActiveGeofence(geofenceData.geofence);
//           setBaseLocation(geofenceData.geofence.baseLocation);
//           setRadius(geofenceData.geofence.radius);
//         }
//       }

//       // Fetch bikes
//       const bikesResponse = await fetch(`${API_BASE_URL}/bikes`);
//       if (bikesResponse.ok) {
//         const bikesData = await bikesResponse.json();
//         if (bikesData.bikes) {
//           setBikes(bikesData.bikes);
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching initial data:', error);
//     }
//   };

//   const handleMapClick = useCallback((latlng: LatLng): void => {
//     setBaseLocation({ lat: latlng.lat, lng: latlng.lng });
//   }, []);

//   const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
//     const value = parseFloat(e.target.value);
//     if (value > 0) {
//       setRadius(value);
//     }
//   };

//   const setGeofence = async (): Promise<void> => {
//     setIsSettingGeofence(true);
//     try {
//       const url = `${API_BASE_URL}/geofencing/geofence`;
//       console.log('Making request to:', url);
//       console.log('API_BASE_URL:', API_BASE_URL);
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           baseLocation,
//           radius,
//           name: 'Main Geofence'
//         })
//       });

//       if (response.ok) {
//         const data = await response.json();
//         setActiveGeofence(data.geofence);
//         console.log('Geofence set successfully');
//       } else {
//         console.error('Failed to set geofence');
//       }
//     } catch (error) {
//       console.error('Error setting geofence:', error);
//     } finally {
//       setIsSettingGeofence(false);
//     }
//   };

//   const bikesInFence: Bike[] = bikes.filter(bike => !bike.isOutsideFence);
//   const bikesOutsideFence: Bike[] = bikes.filter(bike => bike.isOutsideFence);

//   return (
//     <div>
//       <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
//         <div className="mb-8">
//           <h3 className="mb-4 text-center font-semibold text-gray-800 text-2xl dark:text-white/90">
//             Server-Side Geo Fencing Implimented // Remove Title in Production
//           </h3>
          
//           {/* Controls */}
//           <div className="mb-6 space-y-4">
//             <div className="flex items-center gap-4 ">
//               <div className="flex-1 max-w-xs">
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Radius (km)
//                 </label>
//                 <input
//                   type="number"
//                   min="0.1"
//                   step="0.1"
//                   value={radius}
//                   onChange={handleRadiusChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
//                   placeholder="Radius in km"
//                 />
//               </div>
              
//               <div className="flex items-center gap-2 p-4 ">
//                 <button
//                   onClick={setGeofence}
//                   disabled={isSettingGeofence}
//                   className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium text-sm hover:bg-blue-600 disabled:opacity-50"
//                 >
//                   {isSettingGeofence ? 'Setting...' : 'Set Geofence'}
//                 </button>
                
//                 <button
//                   onClick={fetchInitialData}
//                   className="px-4 py-2 bg-purple-500 text-white rounded-md font-medium text-sm hover:bg-purple-600"
//                 >
//                   Refresh
//                 </button>
//               </div>
              
//               <div className="flex items-center gap-2">
//                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                 <span className="text-xs text-gray-600 dark:text-gray-400">
//                   {isConnected ? 'Connected' : 'Disconnected'}
//                 </span>
//               </div>
//             </div>
            
//             <div className="text-sm text-gray-500 dark:text-gray-400">
//               <p>💡 Click on the map to set a new base location, then click "Set Geofence"</p>
//             </div>
//           </div>

//           {/* Stats */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//             <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
//               <h4 className="font-medium text-green-800 dark:text-green-300">Inside Fence</h4>
//               <p className="text-2xl font-bold text-green-600 dark:text-green-400">{bikesInFence.length}</p>
//             </div>
//             <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
//               <h4 className="font-medium text-red-800 dark:text-red-300">Outside Fence</h4>
//               <p className="text-2xl font-bold text-red-600 dark:text-red-400">{bikesOutsideFence.length}</p>
//             </div>
//             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
//               <h4 className="font-medium text-blue-800 dark:text-blue-300">Total Bikes</h4>
//               <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bikes.length}</p>
//             </div>
//           </div>
//         </div>

//         {/* Map */}
//         <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
//           <MapContainer
//             center={[baseLocation.lat, baseLocation.lng]}
//             zoom={13}
//             style={{ height: '100%', width: '100%' }}
//             key={`${baseLocation.lat}-${baseLocation.lng}`}
//           >
//             <TileLayer
//               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
            
//             <MapClickHandler onMapClick={handleMapClick} />
            
//             {/* Base location marker */}
//             <Marker 
//               position={[baseLocation.lat, baseLocation.lng]}
//               icon={defaultIcon}
//             >
//               <Popup>
//                 <div className="p-2">
//                   <h3 className="font-semibold">Base Location</h3>
//                   <p className="text-sm">Lat: {baseLocation.lat.toFixed(6)}</p>
//                   <p className="text-sm">Lng: {baseLocation.lng.toFixed(6)}</p>
//                   {activeGeofence && (
//                     <p className="text-xs text-blue-600 mt-1">Server-managed geofence</p>
//                   )}
//                 </div>
//               </Popup>
//             </Marker>
            
//             {/* Geo fence circle */}
//             <Circle
//               center={[baseLocation.lat, baseLocation.lng]}
//               radius={radius * 1000}
//               pathOptions={{
//                 color: activeGeofence ? '#10B981' : '#3b82f6',
//                 fillColor: activeGeofence ? '#10B981' : '#3b82f6',
//                 fillOpacity: 0.1,
//                 weight: 2,
//                 dashArray: activeGeofence ? undefined : '5, 5'
//               }}
//             />

//             {/* Bike markers */}
//             {bikes.map((bike) => (
//               bike.currentLocation && (
//                 <Marker
//                   key={bike.bikeId}
//                   position={[bike.currentLocation.lat, bike.currentLocation.lng]}
//                   icon={bike.isOutsideFence ? bikeIconRed : bikeIconGreen}
//                 >
//                   <Popup>
//                     <div className="p-2">
//                       <h3 className="font-semibold">{bike.bikeId}</h3>
//                       <p className="text-sm">Speed: {bike.avgSpeed ? `${bike.avgSpeed.toFixed(1)} km/h` : 'N/A'}</p>
//                       <p className="text-sm">Battery: {bike.batteryLevel ? `${bike.batteryLevel.toFixed(0)}%` : 'N/A'}</p>
//                       <p className="text-sm">Distance from base: {bike.distanceFromBase ? `${bike.distanceFromBase.toFixed(2)} km` : 'N/A'}</p>
//                       <p className={`text-sm font-medium ${bike.isOutsideFence ? 'text-red-600' : 'text-green-600'}`}>
//                         Status: {bike.isOutsideFence ? 'Outside Fence' : 'Inside Fence'}
//                       </p>
//                       {bike.lastSeen && (
//                         <p className="text-xs text-gray-500">
//                           Last seen: {new Date(bike.lastSeen).toLocaleTimeString()}
//                         </p>
//                       )}
//                       <p className="text-xs text-blue-600 mt-1">Server-calculated status</p>
//                     </div>
//                   </Popup>
//                 </Marker>
//               )
//             ))}
//           </MapContainer>
//         </div>
        
//         {/* Geo Fence Info Panel // Remove in Production*/}
//         <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
//           <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Server-Side Geo Fence Info // Remove in Production</h4>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Base Location:</span>
//               <p className="font-medium text-gray-800 dark:text-white">
//                 {baseLocation.lat.toFixed(6)}, {baseLocation.lng.toFixed(6)}
//               </p>
//             </div>
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Radius:</span>
//               <p className="font-medium text-gray-800 dark:text-white">{radius} km</p>
//             </div>
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Area:</span>
//               <p className="font-medium text-gray-800 dark:text-white">
//                 {(Math.PI * radius * radius).toFixed(2)} km²
//               </p>
//             </div>
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Status:</span>
//               <p className={`font-medium ${activeGeofence ? 'text-green-600' : 'text-yellow-600'}`}>
//                 {activeGeofence ? 'Active (Server)' : 'Not Set'}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, Popup } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { Socket, io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

// Type definitions
interface Location {
  lat: number;
  lng: number;
}

interface BikeData {
  location: Location;
  avgSpeed: string;
  battery: string;
}

interface BikeUpdateData {
  bikeId: string;
  data: BikeData;
  timestamp: string;
  geofencing?: {
    isOutsideFence: boolean;
    distanceFromBase: number;
    geofenceId: string;
  };
}

interface Bike {
  bikeId: string;
  currentLocation: Location;
  avgSpeed: number;
  batteryLevel: number;
  lastSeen: string;
  status: string;
  isOutsideFence: boolean;
  distanceFromBase: number;
}

interface MapClickHandlerProps {
  onMapClick: (latlng: LatLng) => void;
}

interface Geofence {
  id: string;
  name: string;
  baseLocation: Location;
  radius: number;
  isActive: boolean;
}

// Icon definitions
const defaultIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const bikeIconGreen = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
});

const bikeIconRed = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
});

function MapClickHandler({ onMapClick }: MapClickHandlerProps): null {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

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

export default function GeoFencing(): JSX.Element {
  const [baseLocation, setBaseLocation] = useState<Location>({
    lat: 19.0760,
    lng: 72.8777
  });
  const [radius, setRadius] = useState<number>(1);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [activeGeofence, setActiveGeofence] = useState<Geofence | null>(null);
  const [isSettingGeofence, setIsSettingGeofence] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  const API_BASE_URL = import.meta.env.VITE_GEOFENCE_URL || 'http://localhost:3001/api';
  const SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';

  // Initialize socket connection
  useEffect(() => {
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

    // Listen for bike updates from server
    socketRef.current.on('bikeUpdate', (data: BikeUpdateData) => {
      console.log('Received bike update:', data);
      setLastUpdate(new Date().toLocaleTimeString());
      
      setBikes(prevBikes => {
        const existingBikeIndex = prevBikes.findIndex(bike => bike.bikeId === data.bikeId);
        
        const updatedBike: Bike = {
          bikeId: data.bikeId,
          currentLocation: data.data.location,
          avgSpeed: parseFloat(data.data.avgSpeed),
          batteryLevel: parseFloat(data.data.battery),
          lastSeen: data.timestamp,
          status: 'active',
          isOutsideFence: data.geofencing?.isOutsideFence || false,
          distanceFromBase: data.geofencing?.distanceFromBase || 0
        };

        if (existingBikeIndex !== -1) {
          const updatedBikes = [...prevBikes];
          updatedBikes[existingBikeIndex] = updatedBike;
          return updatedBikes;
        } else {
          return [...prevBikes, updatedBike];
        }
      });
    });

    // Listen for initial data
    socketRef.current.on('initialBikesData', (bikesData: Bike[]) => {
      setBikes(bikesData);
    });

    socketRef.current.on('activeGeofence', (geofence: Geofence) => {
      setActiveGeofence(geofence);
      setBaseLocation(geofence.baseLocation);
      setRadius(geofence.radius);
    });

    // Listen for geofence updates
    socketRef.current.on('geofenceUpdated', (geofence: Geofence) => {
      setActiveGeofence(geofence);
      setBaseLocation(geofence.baseLocation);
      setRadius(geofence.radius);
    });

    // Fetch initial data
    fetchInitialData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchInitialData = async (): Promise<void> => {
    try {
      // Fetch active geofence
      const geofenceResponse = await fetch(`${API_BASE_URL}/geofencing/geofence/active`);
      if (geofenceResponse.ok) {
        const geofenceData = await geofenceResponse.json();
        if (geofenceData.geofence) {
          setActiveGeofence(geofenceData.geofence);
          setBaseLocation(geofenceData.geofence.baseLocation);
          setRadius(geofenceData.geofence.radius);
        }
      }

      // Fetch bikes
      const bikesResponse = await fetch(`${API_BASE_URL}/bikes`);
      if (bikesResponse.ok) {
        const bikesData = await bikesResponse.json();
        if (bikesData.bikes) {
          setBikes(bikesData.bikes);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleMapClick = useCallback((latlng: LatLng): void => {
    setBaseLocation({ lat: latlng.lat, lng: latlng.lng });
  }, []);

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value);
    if (value > 0) {
      setRadius(value);
    }
  };

  const setGeofence = async (): Promise<void> => {
    setIsSettingGeofence(true);
    try {
      const url = `${API_BASE_URL}/geofencing/geofence`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseLocation,
          radius,
          name: 'Main Geofence'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveGeofence(data.geofence);
        console.log('Geofence set successfully');
      } else {
        console.error('Failed to set geofence');
      }
    } catch (error) {
      console.error('Error setting geofence:', error);
    } finally {
      setIsSettingGeofence(false);
    }
  };

  const bikesInFence: Bike[] = bikes.filter(bike => !bike.isOutsideFence);
  const bikesOutsideFence: Bike[] = bikes.filter(bike => bike.isOutsideFence);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Geo Fencing
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time location monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <Badge color={isConnected ? 'success' : 'error'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {lastUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updated: {lastUpdate}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Radius (km)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={radius}
                onChange={handleRadiusChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white transition-all duration-200"
                placeholder="Enter radius"
              />
            </div>
            
            <div className="flex gap-2 sm:items-end">
              <button
                onClick={setGeofence}
                disabled={isSettingGeofence}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                {isSettingGeofence ? 'Setting...' : 'Set Geofence'}
              </button>
              
              <button
                onClick={fetchInitialData}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          💡 Click on the map to set a new base location, then click "Set Geofence"
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl dark:bg-green-900/20">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Inside Fence</span>
              <h4 className="text-2xl font-bold text-green-600 dark:text-green-400">{bikesInFence.length}</h4>
            </div>
          </div>
          <Badge color="success" variant="light">Active</Badge>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-xl dark:bg-red-900/20">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Outside Fence</span>
              <h4 className="text-2xl font-bold text-red-600 dark:text-red-400">{bikesOutsideFence.length}</h4>
            </div>
          </div>
          <Badge color="error" variant="light">Alert</Badge>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl dark:bg-blue-900/20">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Bikes</span>
              <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bikes.length}</h4>
            </div>
          </div>
          <Badge color="info" variant="light">Monitoring</Badge>
        </div>
      </div>

      {/* Map Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Live Map</h4>
          <Badge color={activeGeofence ? 'success' : 'warning'} variant="light">
            {activeGeofence ? 'Geofence Active' : 'No Geofence Set'}
          </Badge>
        </div>
        
        <div className="h-[400px] sm:h-[500px] lg:h-[600px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <MapContainer
            center={[baseLocation.lat, baseLocation.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            key={`${baseLocation.lat}-${baseLocation.lng}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} />
            
            {/* Base location marker */}
            <Marker 
              position={[baseLocation.lat, baseLocation.lng]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">Base Location</h3>
                  <p className="text-sm">Lat: {baseLocation.lat.toFixed(6)}</p>
                  <p className="text-sm">Lng: {baseLocation.lng.toFixed(6)}</p>
                  {activeGeofence && (
                    <p className="text-xs text-blue-600 mt-1">Server-managed geofence</p>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Geo fence circle */}
            <Circle
              center={[baseLocation.lat, baseLocation.lng]}
              radius={radius * 1000}
              pathOptions={{
                color: activeGeofence ? '#10B981' : '#3b82f6',
                fillColor: activeGeofence ? '#10B981' : '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: activeGeofence ? undefined : '5, 5'
              }}
            />

            {/* Bike markers */}
            {bikes.map((bike) => (
              bike.currentLocation && (
                <Marker
                  key={bike.bikeId}
                  position={[bike.currentLocation.lat, bike.currentLocation.lng]}
                  icon={bike.isOutsideFence ? bikeIconRed : bikeIconGreen}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{bike.bikeId}</h3>
                      <p className="text-sm">Speed: {bike.avgSpeed ? `${bike.avgSpeed.toFixed(1)} km/h` : 'N/A'}</p>
                      <p className="text-sm">Battery: {bike.batteryLevel ? `${bike.batteryLevel.toFixed(0)}%` : 'N/A'}</p>
                      <p className="text-sm">Distance from base: {bike.distanceFromBase ? `${bike.distanceFromBase.toFixed(2)} km` : 'N/A'}</p>
                      <p className={`text-sm font-medium ${bike.isOutsideFence ? 'text-red-600' : 'text-green-600'}`}>
                        Status: {bike.isOutsideFence ? 'Outside Fence' : 'Inside Fence'}
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
          </MapContainer>
        </div>
      </div>
        
      {/* Geofence Details */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 dark:border-gray-800 dark:from-gray-900/50 dark:to-gray-900/20 p-5 md:p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Geofence Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
            <span className="text-sm text-gray-600 dark:text-gray-400">Base Location</span>
            <p className="font-medium text-gray-800 dark:text-white mt-1">
              {baseLocation.lat.toFixed(6)}, {baseLocation.lng.toFixed(6)}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
            <span className="text-sm text-gray-600 dark:text-gray-400">Radius</span>
            <p className="font-medium text-gray-800 dark:text-white mt-1">{radius} km</p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
            <span className="text-sm text-gray-600 dark:text-gray-400">Coverage Area</span>
            <p className="font-medium text-gray-800 dark:text-white mt-1">
              {(Math.PI * radius * radius).toFixed(2)} km²
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
            <p className={`font-medium mt-1 ${activeGeofence ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {activeGeofence ? 'Active' : 'Not Set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}