// Environment-based API URL configuration
// In production, this should be set via environment variables

// Check if we have an environment variable for the API URL
const envApiUrl = import.meta.env.VITE_API_BASE_URL;

// Default to localhost for development, but use the environment variable if available
export const API_BASE_URL = envApiUrl || 'http://localhost:8000';

// Add other configuration values as needed 