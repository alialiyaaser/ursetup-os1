import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({
  baseURL: `${BACKEND}/api`,
  timeout: 15000,
});
