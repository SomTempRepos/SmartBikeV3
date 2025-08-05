// FourCards.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  BoltIcon,
  PaperPlaneIcon,
  BoxIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";

interface LiveBikeStatsProps {
  cardTitles?: [string, string, string, string];
}

interface BikeData {
  bikeId: string;
  timestamp: string;
  serverTimestamp: string;
  receivedAt: number;
  data: {
    avgSpeed: number;
    distance: number;
    location: {
      lat: number;
      lng: number;
    };
    batteryLevel?: number;
    engineTemp?: number;
    fuelLevel?: number;
    battery?: number;
  };
}

interface LocationHistory {
  lat: number;
  lng: number;
  timestamp: string;
}

interface SpeedLimitData {
  bikeId: string;
  speedLimit: number;
  setAt: string;
  setBy: string;
}

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

export default function LiveBikeStats({ cardTitles }: LiveBikeStatsProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<BikeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);
  const [totalCalculatedDistance, setTotalCalculatedDistance] = useState<number>(0);
  const [baseLocation, setBaseLocation] = useState<{ lat: number; lng: number }>({
    lat: 19.0760, // Default Mumbai coordinates
    lng: 72.8777
  });
  const [distanceFromBase, setDistanceFromBase] = useState<number>(0);
  const [speedLimit, setSpeedLimit] = useState<number>(50); // Default speed limit
  const [isSettingSpeedLimit, setIsSettingSpeedLimit] = useState<boolean>(false);
  const [speedLimitStatus, setSpeedLimitStatus] = useState<string>('');
  
  const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL;
  const API_BASE_URL = import.meta.env.VITE_SPEED_LIMIT_UR || 'http://localhost:3001/api';

  const titles = cardTitles || [
    "Current Speed",
    "Total Distance",
    "Battery",
    "Distance from Base"
  ];

  // Get the current bike ID (you might get this from props, context, or URL params)
  const currentBikeId = "BIKE001"; // This should come from your app state

  // Fetch current speed limit on component mount
  useEffect(() => {
    fetchCurrentSpeedLimit();
  }, [currentBikeId]);

  // Fetch current speed limit from server
  const fetchCurrentSpeedLimit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bikes/${currentBikeId}/speed-limit`);
      const data = await response.json();
      
      if (data.success && data.speedLimit) {
        setSpeedLimit(data.speedLimit.speedLimit);
        console.log('Loaded speed limit:', data.speedLimit.speedLimit);
      }
    } catch (error) {
      console.error('Error fetching speed limit:', error);
    }
  };

  // Send speed limit to server
  const handleSetSpeedLimit = async () => {
    if (!currentBikeId || isSettingSpeedLimit) return;

    setIsSettingSpeedLimit(true);
    setSpeedLimitStatus('Setting...');

    try {
      const response = await fetch(`${API_BASE_URL}/bikes/${currentBikeId}/speed-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speedLimit: speedLimit,
          setBy: 'user' // or get from user context
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSpeedLimitStatus('✅ Speed limit set successfully!');
        console.log('Speed limit set successfully:', data);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSpeedLimitStatus('');
        }, 3000);
      } else {
        setSpeedLimitStatus('❌ Failed to set speed limit');
        console.error('Failed to set speed limit:', data.error);
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          setSpeedLimitStatus('');
        }, 5000);
      }
    } catch (error) {
      setSpeedLimitStatus('❌ Network error');
      console.error('Error setting speed limit:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSpeedLimitStatus('');
      }, 5000);
    } finally {
      setIsSettingSpeedLimit(false);
    }
  };

  useEffect(() => {
    let newSocket: Socket | null = null;
    
    try {
      newSocket = io(SOCKET_SERVER_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: true,
        timeout: 20000
      });

      newSocket.on("connect", () => {
        console.log("Connected to server via WebSocket");
        setIsConnected(true);
        setError(null);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);
        setIsConnected(false);
        setError(`Disconnected: ${reason}`);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
        setError(`Connection error: ${error.message}`);
      });

      // Listen for speed limit updates from server
      newSocket.on("speedLimitUpdated", (data: { bikeId: string; speedLimit: number; setAt: string }) => {
        console.log("Speed limit updated via WebSocket:", data);
        if (data.bikeId === currentBikeId) {
          setSpeedLimit(data.speedLimit);
          setSpeedLimitStatus(`✅ Speed limit updated to ${data.speedLimit} km/h`);
          
          // Clear status after 3 seconds
          setTimeout(() => {
            setSpeedLimitStatus('');
          }, 3000);
        }
      });

      newSocket.on("bikeData", (data: BikeData) => {
        console.log("Received bike data via WebSocket:", data);
        if (data && data.data && data.data.location) {
          // Calculate distance from base location
          const distanceFromBaseCalc = calculateDistance(
            baseLocation.lat,
            baseLocation.lng,
            data.data.location.lat,
            data.data.location.lng
          );
          setDistanceFromBase(distanceFromBaseCalc);

          // Update location history and calculate total distance
          setLocationHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const newLocation: LocationHistory = {
              lat: data.data.location.lat,
              lng: data.data.location.lng,
              timestamp: data.timestamp
            };

            // Calculate distance from last location if we have previous data
            if (newHistory.length > 0) {
              const lastLocation = newHistory[newHistory.length - 1];
              const distanceFromLast = calculateDistance(
                lastLocation.lat,
                lastLocation.lng,
                newLocation.lat,
                newLocation.lng
              );
              
              // Only add distance if it's significant (> 0.001 km = 1 meter)
              // This helps filter out GPS noise
              if (distanceFromLast > 0.001) {
                setTotalCalculatedDistance(prev => prev + distanceFromLast);
              }
            }

            // Add new location to history
            newHistory.push(newLocation);

            // Keep only last 100 locations to prevent memory issues
            if (newHistory.length > 100) {
              newHistory.shift();
            }

            return newHistory;
          });

          setLatestData(data);
          setError(null);
        }
      });

      setSocket(newSocket);
    } catch (err) {
      console.error("Error setting up WebSocket:", err);
      setError(`Setup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return () => {
      if (newSocket) {
        console.log("Cleaning up WebSocket connection");
        newSocket.close();
      }
    };
  }, [baseLocation, currentBikeId]);

  const formatSpeed = (speed: number) => {
    return `${speed.toFixed(1)} km/h`;
  };

  const formatDistance = (distance: number) => {
    return `${distance.toFixed(2)} km`;
  };

  const resetDistance = () => {
    setTotalCalculatedDistance(0);
    setLocationHistory([]);
  };

  const updateBaseLocation = (lat: number, lng: number) => {
    setBaseLocation({ lat, lng });
  };

  const handleSpeedLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setSpeedLimit(value);
    }
  };

  // Check if current speed exceeds speed limit
  const isSpeedExceeded = latestData?.data?.avgSpeed ? latestData.data.avgSpeed > speedLimit : false;

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {error && (
          <div className="col-span-4 p-4 text-red-500 bg-red-100 rounded-lg dark:bg-red-900/20">
            {error}
          </div>
        )}
        
        {/* Speed Metric with Speed Limit Input */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col">
          {cardTitles ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center mb-2">{titles[0]}</span>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-2">
                <BoxIcon className="text-gray-800 size-6 dark:text-white/90" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-4">
                <BoltIcon className="text-gray-800 size-6 dark:text-white/90" />
              </div>
              
              {/* Current Speed Display */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{titles[0]}</span>
                  <h4 className={`mt-2 font-bold text-title-sm ${isSpeedExceeded ? 'text-red-500' : 'text-gray-800 dark:text-white/90'}`}>
                    {latestData?.data?.avgSpeed ? formatSpeed(latestData.data.avgSpeed) : "0.0 km/h"}
                  </h4>
                </div>
                <Badge color={isConnected ? "success" : "error"}>
                  {isConnected ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {isConnected ? "Live" : "Offline"}
                </Badge>
              </div>

              {/* Speed Limit Input Section */}
              <div className="border-t pt-3 dark:border-gray-700">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Speed Limit (km/h)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={speedLimit}
                    onChange={handleSpeedLimitChange}
                    disabled={isSettingSpeedLimit}
                    className="w-flex px-2 py-2 text-sm border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="50"
                  />
                  <button
                    onClick={handleSetSpeedLimit}
                    disabled={isSettingSpeedLimit}
                    className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Set Speed Limit"
                  >
                    {isSettingSpeedLimit ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg 
                        className="w-3 h-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2.5} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Status Messages */}
                {speedLimitStatus && (
                  <div className="mt-2 text-xs font-medium">
                    <span className={
                      speedLimitStatus.includes('✅') ? 'text-green-600' :
                      speedLimitStatus.includes('❌') ? 'text-red-500' :
                      'text-blue-500'
                    }>
                      {speedLimitStatus}
                    </span>
                  </div>
                )}
                
                {isSpeedExceeded && (
                  <div className="mt-2 text-xs text-red-500 font-medium">
                    ⚠️ Speed limit exceeded!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Total Distance Metric (Calculated) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col items-center">
          {cardTitles ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center mb-2">{titles[1]}</span>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-2">
                <BoxIcon className="text-gray-800 size-6 dark:text-white/90" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
              </div>
              <div className="flex items-end justify-between mt-5 w-full">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{titles[1]}</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {formatDistance(totalCalculatedDistance)}
                  </h4>
                </div>
                <Badge color="success">
                  <ArrowUpIcon />
                  {latestData ? "Active" : "Idle"}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Battery Metric */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col items-center">
          {cardTitles ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center mb-2">{titles[2]}</span>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-2">
                <BoxIcon className="text-gray-800 size-6 dark:text-white/90" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <BoltIcon className="text-yellow-500 size-6 dark:text-yellow-400" />
              </div>
              <div className="flex items-end justify-between mt-5 w-full">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{titles[2]}</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {typeof latestData?.data?.battery === 'number' ? `${latestData.data.battery}%` : "--%"}
                  </h4>
                </div>
                <Badge color={isConnected ? "success" : "error"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Distance from Base Metric */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col items-center">
          {cardTitles ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center mb-2">{titles[3]}</span>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-2">
                <BoxIcon className="text-gray-800 size-6 dark:text-white/90" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <PaperPlaneIcon className="text-blue-500 size-6 dark:text-blue-400" />
              </div>
              <div className="flex items-end justify-between mt-5 w-full">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">{titles[3]}</span>
                  <span className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {formatDistance(distanceFromBase)}
                  </span>
                  <div className="mt-1 text-xs text-gray-400">
                    <div>Lat: {latestData?.data?.location?.lat !== undefined ? latestData.data.location.lat.toFixed(6) : '--'}</div>
                    <div>Lng: {latestData?.data?.location?.lng !== undefined ? latestData.data.location.lng.toFixed(6) : '--'}</div>
                  </div>
                </div>
                {latestData?.data?.location?.lat !== undefined && latestData?.data?.location?.lng !== undefined && (
                  <span
                    className="cursor-pointer select-none"
                    onClick={() => {
                      const lat = latestData.data.location.lat;
                      const lng = latestData.data.location.lng;
                      const url = `https://www.google.com/maps?q=${lat},${lng}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Badge color="info">
                      Locate
                    </Badge>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}