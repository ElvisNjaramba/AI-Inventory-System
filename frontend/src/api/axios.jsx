// api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// attach access token
api.interceptors.request.use(config => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle token expiry
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const { data } = await axios.post("http://127.0.0.1:8000/api/token/refresh/", { refresh });
          localStorage.setItem("access", data.access);
          api.defaults.headers.Authorization = `Bearer ${data.access}`;
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch (refreshErr) {
          console.error("Token refresh failed:", refreshErr);
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
