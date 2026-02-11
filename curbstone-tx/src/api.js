// API utility with auto-detecting API URL

// Auto-detect API base URL
const getApiBaseUrl = () => {
  // Always use relative URL - Vite proxy handles dev, and production uses same domain
  return '/api';
};

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Try to parse JSON, but handle non-JSON responses
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Response might not be JSON (e.g., connection error)
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      // Don't log 401 errors as they're expected when not authenticated
      const errorMessage = data.error || `HTTP ${response.status}`;
      if (response.status !== 401) {
        console.error('API call error:', errorMessage);
      }
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // Provide more helpful error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('API call error: Cannot connect to server. Is the backend running?', error);
      throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3000.');
    }
    // Only log non-401 errors (401 is expected when not logged in)
    if (!error.message.includes('Unauthorized')) {
      console.error('API call error:', error);
    }
    throw error;
  }
}

// Authentication API
export const authAPI = {
  login: async (username, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST',
    });
  },

  me: async () => {
    return apiCall('/auth/me', {
      method: 'GET',
    });
  },
};

// Users API
export const usersAPI = {
  list: async () => {
    return apiCall('/users', {
      method: 'GET',
    });
  },

  create: async (username, password, allowedTransactionTypes, role) => {
    return apiCall('/users', {
      method: 'POST',
      body: { username, password, allowedTransactionTypes, role },
    });
  },

  update: async (id, updates) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: updates,
    });
  },
};

// Logs API
export const logsAPI = {
  write: async (logEntry) => {
    return apiCall('/logs', {
      method: 'POST',
      body: logEntry,
    });
  },
};

