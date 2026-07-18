import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Interfaces
export interface User {
  id: number;
  email: string;
  fullName: string;
  role: number;
  status: string;
}

export interface Wallet {
  id: number;
  walletNumber: string;
  type: string;
  currency: string;
  balance: string;
  availableBalance: string;
  status: string;
  isPrimary: boolean;
  userRole: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface LoginResponse {
  user: User;
  auth: AuthTokens;
  wallets: Wallet[];
}

interface AuthState {
  token: string | null;
  refreshToken?: string | null;
  user: User | null;
  wallets: Wallet[];
  isAuthenticated: boolean;
}

// Función para cargar el estado inicial desde localStorage
function getInitialState(): AuthState {
  if (browser) {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const walletsStr = localStorage.getItem('wallets');
      const user = userStr ? JSON.parse(userStr) : null;
      const wallets = walletsStr ? JSON.parse(walletsStr) : [];
      
      return {
        token,
        user,
        wallets,
        isAuthenticated: !!token && !!user
      };
    } catch (e) {
      console.error('Error loading auth state from localStorage:', e);
    }
  }
  
  return {
    token: null,
    user: null,
    wallets: [],
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
    login: (token: string, user: User, refreshToken?: string, wallets: Wallet[] = []) => {
      // Guardar en localStorage
      if (browser) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('wallets', JSON.stringify(wallets));
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Actualizar el store
      set({
        token,
        refreshToken: refreshToken || null,
        user,
        wallets,
        isAuthenticated: true
      });
    },
    
    // Método para cerrar sesión
    logout: () => {
      // Limpiar localStorage
      if (browser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('wallets');
        localStorage.removeItem('refreshToken');
      }
      
      // Actualizar el store
      set({
        token: null,
        refreshToken: null,
        user: null,
        wallets: [],
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
    },
    
    // Método para actualizar las billeteras
    updateWallets: (wallets: Wallet[]) => {
      update(state => {
        if (browser) {
          localStorage.setItem('wallets', JSON.stringify(wallets));
        }
        return {
          ...state,
          wallets
        };
      });
    },
    
    // Método para obtener la billetera primaria
    getPrimaryWallet: () => {
      const state = getInitialState();
      return state.wallets.find(wallet => wallet.isPrimary) || state.wallets[0] || null;
    }
  };
}

// Exportar el store
export const auth = createAuthStore(); 