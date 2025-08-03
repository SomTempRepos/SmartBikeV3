// Entry point for Smart-Cycle Server with Geofencing
const App = require('./src/app');

// Create and start the application
const app = new App();

// Start the server with enhanced geofencing capabilities
app.start().catch((error) => {
  console.error('❌ Failed to start Smart-Cycle Server with Geofencing:', error);
  process.exit(1);
});