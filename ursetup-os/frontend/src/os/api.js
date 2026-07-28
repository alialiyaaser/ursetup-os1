import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const osApi = axios.create({
  baseURL: `${BACKEND}/api/os`,
  timeout: 15000,
});

// Reuse token from legacy AuthContext (localStorage key ur_admin_token)
osApi.interceptors.request.use((config) => {
  try {
    const tk = localStorage.getItem("ur_admin_token");
    if (tk) config.headers.Authorization = `Bearer ${tk}`;
  } catch (e) { /* ignore */ }
  return config;
});
