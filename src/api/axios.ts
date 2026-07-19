import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        message: 'Network error',
      });
    }

    const { status, data } = error.response;

    const isSessionCheck = error.config?.url?.endsWith('/auth/session');

    if (status === 401 && !isSessionCheck && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject({
      status,
      message: data?.message || 'Unexpected error',
    });
  },
);

export default api;
