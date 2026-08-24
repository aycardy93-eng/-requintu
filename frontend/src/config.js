const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:3000';

export const API_URL = `${BACKEND_ORIGIN}/api`;

export default BACKEND_ORIGIN;
