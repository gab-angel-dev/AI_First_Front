import axios from "axios";

// Configuração base do Axios para chamadas à API Admin
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar autenticação (quando implementada)
api.interceptors.request.use((config) => {
  // Adicionar token de autenticação aqui quando necessário
  // const token = localStorage.getItem("token");
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

export default api;
