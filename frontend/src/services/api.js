import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Fonction pour renouveler le token
const refreshToken = async () => {
  try {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
      throw new Error('Refresh token non trouvé');
    }

    const response = await fetch(API_BASE_URL + '/api/auth/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      throw new Error('Échec du renouvellement du token');
    }

    const data = await response.json();
    localStorage.setItem('token', data.access);
    return data.access;
  } catch (error) {
    // Désactivation de la déconnexion automatique :
    // Ne pas supprimer le token ni rediriger
    // window.location.href = '/login';
    throw error;
  }
};

// Fonction pour faire une requête avec renouvellement automatique du token
const apiRequest = async (url, options = {}) => {
  let token = localStorage.getItem('token');
  
  // Ajouter le token à l'en-tête Authorization
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Si la réponse est 401 (token expiré), essayer de le renouveler
    if (response.status === 401) {
      try {
        token = await refreshToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          
          // Réessayer la requête avec le nouveau token
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw errorData;
          }
          
          return await retryResponse.json();
        } else {
          // Le renouvellement a échoué, lever une erreur mais NE PAS rediriger ni supprimer le token
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
      } catch (refreshError) {
        // NE PAS rediriger ni supprimer le token
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw errorData;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Service pour les rendez-vous
export const rendezVousService = {
  // Créer un nouveau rendez-vous
  createRendezVous: async (data) => {
    return await apiRequest(API_BASE_URL + '/api/rendez-vous/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Obtenir tous les rendez-vous
  getAllRendezVous: async () => {
    try {
      const response = await api.get(API_BASE_URL + '/api/rendez-vous/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtenir un rendez-vous par ID
  getRendezVousById: async (id) => {
    try {
      const response = await api.get(API_BASE_URL + `/api/rendez-vous/${id}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Rechercher par plaque
  searchByPlaque: async (plaque) => {
    try {
      const response = await api.get(API_BASE_URL + `/api/rendez-vous/par_plaque/?plaque=${plaque}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Rechercher par CIN
  searchByCIN: async (cin) => {
    try {
      const response = await api.get(API_BASE_URL + `/api/rendez-vous/par_cin/?cin=${cin}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtenir les rendez-vous d'aujourd'hui
  getTodayRendezVous: async () => {
    try {
      const response = await api.get(API_BASE_URL + '/api/rendez-vous/aujourd_hui/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtenir les prochains rendez-vous
  getUpcomingRendezVous: async () => {
    try {
      const response = await api.get(API_BASE_URL + '/api/rendez-vous/prochains/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Valider un rendez-vous
  validateRendezVous: async (id) => {
    try {
      const response = await api.post(API_BASE_URL + `/api/rendez-vous/${id}/valider/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Annuler un rendez-vous
  cancelRendezVous: async (id) => {
    try {
      const response = await api.post(API_BASE_URL + `/api/rendez-vous/${id}/annuler/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Terminer un rendez-vous
  finishRendezVous: async (id) => {
    try {
      const response = await api.post(API_BASE_URL + `/api/rendez-vous/${id}/terminer/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtenir le QR code d'un rendez-vous
  getQRCode: async (id) => {
    try {
      const response = await api.get(API_BASE_URL + `/api/rendez-vous/${id}/qr_code/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const getMesRendezVous = async () => {
  try {
    return await apiRequest(API_BASE_URL + '/api/mes-rendez-vous/');
  } catch (error) {
    throw error;
  }
};

export const modifierRendezVous = async (id, data) => {
  try {
    return await apiRequest(API_BASE_URL + `/api/modifier-rendez-vous/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
};

export const supprimerRendezVous = async (id) => {
  try {
    return await apiRequest(API_BASE_URL + `/api/supprimer-rendez-vous/${id}/`, {
      method: 'DELETE',
    });
  } catch (error) {
    throw error;
  }
};

export default api; 

export function sendQrCodeToInterne(qrData) {
  // URL du portail interne (à adapter selon ton URL)
  const internalPortalUrl = 'http://localhost:8001/api/qr-codes/receive/';
  
  return axios.post(internalPortalUrl, qrData, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000 // 10 secondes
  });
} 