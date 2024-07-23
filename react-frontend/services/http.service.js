
import axios from "axios";
import Cookies from "universal-cookie";
import toastHandler from "../src/helpers/Toasthandler";

const baseURL = import.meta.env.VITE_API_BASE_URL;
const cookies = new Cookies();

const api = axios.create({
  baseURL: baseURL,
});

// Request interceptor to add Authorization header
api.interceptors.request.use(
  (request) => {
    const token = cookies.get("access");
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle rate limiting error
      if (error.response.status === 429) {
        toastHandler('You are sending too many requests. Please wait before trying again.', 'error');
      } else {
        // Handle other errors
        toastHandler(error.response.data.detail || 'An error occurred', "error");
        if (error.response.status === 401) {
          console.error("Unauthorized, logging out ...");
          cookies.remove("access", { path: "/" });
          cookies.remove("refresh", { path: "/" });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
