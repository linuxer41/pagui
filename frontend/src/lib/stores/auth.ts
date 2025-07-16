import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Interfaces
export interface User {
  userId?: number;
  companyId?: number;
  email?: string;
  name?: string;  // Campo para nombre completo
  role?: string;
  responseCode: number;
  message: string;
}

interface AuthState {
  token: string | null;
  refreshToken?: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

// Función para cargar el estado inicial desde localStorage
function getInitialState(): AuthState {
  if (browser) {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      return {
        token,
        user,
        isAuthenticated: !!token && !!user
      };
    } catch (e) {
      console.error('Error loading auth state from localStorage:', e);
    }
  }
  
  return {
    token: null,
    user: null,
    isAuthenticated: false
  };
}

// Crear el store
function createAuthStore() {
  const initialState = getInitialState();
  const { subscribe, set, update } = writable<AuthState>(initialState);
  
  return {
    subscribe,
    
    // Método para iniciar sesión
    login: (token: string, user: User, refreshToken?: string) => {
      // Guardar en localStorage
      if (browser) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Actualizar el store
      set({
        token,
        refreshToken: refreshToken || null,
        user,
        isAuthenticated: true
      });
    },
    
    // Método para cerrar sesión
    logout: () => {
      // Limpiar localStorage
      if (browser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('refreshToken');
      }
      
      // Actualizar el store
      set({
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false
      });
    },
    
    // Método para actualizar el usuario
    updateUser: (user: User) => {
      update(state => {
        if (browser) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        return {
          ...state,
          user
        };
      });
    },
    
    // Método para actualizar el token
    updateToken: (token: string) => {
      update(state => {
        if (browser) {
          localStorage.setItem('token', token);
        }
        return {
          ...state,
          token
        };
      });
    }
  };
}

// Exportar el store
export const auth = createAuthStore(); 