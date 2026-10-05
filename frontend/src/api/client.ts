import axios from 'axios';

// Vite proxy routes /api to http://127.0.0.1:8000, stripping /api prefix
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('farm_erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirect loop if already on a public authentication page
      const isPublicAuthPage = ['/login', '/verify-email', '/reset-password'].some((p) =>
        window.location.pathname.startsWith(p)
      );
      if (!isPublicAuthPage) {
        localStorage.removeItem('farm_erp_token');
        localStorage.removeItem('farm_erp_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
