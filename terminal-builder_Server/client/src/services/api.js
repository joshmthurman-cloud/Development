import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  checkSession: () => api.get('/auth/session')
};

// VAR Processing API
export const varAPI = {
  upload: (file, varType = 'TSYS') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('varType', varType);
    return api.post('/var/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBatch: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/var/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  createTPN: (data) => api.post('/var/create-tpn', data),
  populateParameters: (data) => api.post('/var/populate-parameters', data),
  addMerchantLocation: (data) => api.post('/var/add-merchant-location', data),
  enableSpin: (data) => api.post('/var/enable-spin', data),
  getTpnParameters: (tpn, fieldNames = null) => {
    const url = `/var/tpn/${tpn}/parameters`;
    const params = fieldNames && fieldNames.length > 0 ? { fieldNames: fieldNames.join(',') } : {};
    return api.get(url, { params });
  },
  getSteamFields: () => api.get('/var/steam-fields'),
  getHistory: () => api.get('/var/history'),
  getHistoryItem: (id) => api.get(`/var/history/${id}`)
};

// Templates API
export const templatesAPI = {
  getTemplates: (varType = null) => {
    const params = varType ? { varType } : {};
    return api.get('/templates', { params });
  },
  getTemplateParameters: (templateId, varType = null) => {
    const params = varType ? { varType } : {};
    return api.get(`/templates/${templateId}/parameters`, { params });
  }
};

// Locations API
export const locationsAPI = {
  getLocations: () => api.get('/var/locations')
};

// Merchants and Locations API
export const merchantsLocationsAPI = {
  getMerchantsLocations: (tpn, varType = null) => {
    if (tpn) {
      const params = varType ? { varType } : {};
      return api.get(`/var/merchants-locations/${tpn}`, { params });
    } else {
      // For UR, can get merchants without TPN
      return api.get(`/var/merchants-locations`, { params: { varType: varType || 'UR' } });
    }
  }
};

// STEAM API
export const steamAPI = {
  getConfig: () => api.get('/steam/config'),
  updateConfig: (config) => api.put('/steam/config', config)
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (username, password, role) => api.post('/users', { username, password, role }),
  updatePassword: (userId, password) => api.put(`/users/${userId}/password`, { password }),
  updateRole: (userId, role) => api.put(`/users/${userId}/role`, { role }),
  delete: (userId) => api.delete(`/users/${userId}`),
  getSteamCredentials: (userId) => api.get(`/users/${userId}/steam-credentials`),
  setSteamCredentials: (userId, username, password) => api.put(`/users/${userId}/steam-credentials`, { username, password }),
  deleteSteamCredentials: (userId) => api.delete(`/users/${userId}/steam-credentials`)
};

export default api;


