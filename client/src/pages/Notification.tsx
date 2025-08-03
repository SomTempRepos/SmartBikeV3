import React, { useState, useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import ComponentCard from "../components/common/ComponentCard";
import { AlertIcon, AlertHexaIcon, ErrorHexaIcon } from "../icons";

interface Alert {
  id: string;
  bikeId: string;
  type: 'fence_breach';
  message: string;
  distance: string;
  timestamp: string;
  status: string;
  acknowledged: boolean;
}

export default function Notification() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
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

    // Listen for geofence alerts from server
    socketRef.current.on('geofenceAlert', (alert: Alert) => {
      console.log('Received geofence alert:', alert);
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
      setLastUpdate(new Date().toLocaleTimeString());
    });

    socketRef.current.on('recentAlerts', (alertsData: Alert[]) => {
      setAlerts(alertsData);
    });

    // Fetch initial alerts
    fetchInitialAlerts();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchInitialAlerts = async (): Promise<void> => {
    try {
      const alertsResponse = await fetch(`${API_BASE_URL}/geofencing/alerts?limit=10`);
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        if (alertsData.alerts) {
          setAlerts(alertsData.alerts);
        }
      }
    } catch (error) {
      console.error('Error fetching initial alerts:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/geofencing/alerts/${alertId}/acknowledge`, {
        method: 'PUT'
      });

      if (response.ok) {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, acknowledged: true }
              : alert
          )
        );
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const clearAlerts = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/geofencing/alerts/old?hours=0`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error clearing alerts:', error);
    }
  };

  const refreshAlerts = (): void => {
    fetchInitialAlerts();
  };

  return (
    <>
      <PageMeta
        title="Notification | Firefox Dashboard"
        description="Notification page for Firefox Dashboard"
      />
      <PageBreadcrumb pageTitle="Notification" />
      <div className="space-y-6 mt-8">
        <ComponentCard title="Alert" className="">
          <div className="flex items-center gap-4">
            <AlertIcon className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">This is an alert notification.</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">Something needs your attention, but it is not urgent.</div>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Warning" className="">
            {/* Server Alerts Section */}
            <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                    <AlertHexaIcon className="w-5 h-5" />
                    Geofencing Alerts  ({alerts.filter(alert => !alert.acknowledged).length} unacknowledged)
                  </h4>
                  <button
                    onClick={clearAlerts}
                    className="text-sm text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
          
          <div className="space-y-1">
            
            {alerts.length > 0 && (
              <div className="mt-4 p-4">
                
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded text-sm transition-all ${
                      alert.acknowledged 
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-l-4 border-orange-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              🚲 {alert.bikeId}
                            </span>
                            <span className="text-xs px-2 py-1 bg-orange-200 dark:bg-orange-800 rounded">
                              {alert.distance} km from base
                            </span>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="ml-3 text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {alerts.length === 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 text-center py-4">
                    No geofencing alerts at this time
                  </p>
                )}
              </div>
            )}

            {alerts.length === 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  ✅ No geofencing alerts - All bikes are within their designated areas
                </p>
              </div>
            )}
          </div>
        </ComponentCard>

        <ComponentCard title="Risk" className="">
          <div className="flex items-center gap-4">
            <ErrorHexaIcon className="w-8 h-8 text-red-500" />
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">This is a risk notification.</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">Immediate action is required to address this risk.</div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}