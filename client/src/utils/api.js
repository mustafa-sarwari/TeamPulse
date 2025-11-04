import axios from 'axios';

// API base URL - uses Vite proxy in development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * API client for TeamPulse backend
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Teams API
export const teamsApi = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
};

// Tasks API
export const tasksApi = {
  getAll: (teamId) => api.get('/tasks', { params: { teamId } }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Activities API
export const activitiesApi = {
  getAll: (teamId) => api.get('/activities', { params: { teamId } }),
  create: (data) => api.post('/activities', data),
  getStatus: (teamId) => api.get('/activities/status', { params: { teamId } }),
};

// Insights API
export const insightsApi = {
  generate: (teamId) => api.post('/insights', { teamId }),
};

export default api;
