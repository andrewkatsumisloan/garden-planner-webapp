// Environment-based API URL configuration
// In production, this should be set via environment variables

// Check if we have an environment variable for the API URL
const envApiUrl = import.meta.env.VITE_API_BASE_URL;

// Check if we're in production mode
const isProd = import.meta.env.PROD;

// For production, we must have a valid API URL
if (isProd && !envApiUrl) {
  console.error('Missing VITE_API_BASE_URL in production environment!');
}

// Default to localhost for development only. In production, use the environment variable or fallback to window.location.origin
const baseUrl = envApiUrl || 
  (isProd ? window.location.origin : 'http://localhost:8000');

// Export the base URL without the /api path to avoid duplication
export const API_BASE_URL = baseUrl.endsWith('/api') 
  ? baseUrl.slice(0, -4)  // Remove the trailing /api
  : baseUrl;

// Add other configuration values as needed 