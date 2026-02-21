/**
 * Environment Configuration
 * Centralized location for all environment-based URLs and settings
 */

/**
 * Get the API base URL from environment variables or default fallback
 * In development: http://localhost:5000
 * In production: Set via VITE_API_BASE_URL environment variable
 */
export const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // Fallback for development
  console.warn('VITE_API_BASE_URL not set, using default localhost');
  return 'http://localhost:5000';
};

/**
 * Get the file URL from the API base URL
 * Constructs full URL for PDFs and other files
 */
export const getFileUrl = (filePath: string): string => {
  const baseUrl = getApiBaseUrl();
  // Ensure no double slashes
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Get the server base URL (without /api suffix)
 * Used for accessing file endpoints and other non-API routes
 */
export const getServerBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Remove '/api' suffix if present
  return apiUrl.replace(/\/api\/?$/, '');
};
