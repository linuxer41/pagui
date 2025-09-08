import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { company } from './company';

// Interfaces
export interface User {
  id: number;
  email: string;
  fullName: string;
  roleName: string;
  status: string;
}

export interface Account {
  id: number;
  accountNumber: string;
  accountType: string;
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
  accounts: Account[];
}

interface AuthState {
  token: string | null;
  refreshToken?: string | null;
  user: User | null;
  accounts: Account[];
  isAuthenticated: boolean;
}

// Función para cargar el estado inicial desde localStorage
function getInitialState(): AuthState {
  if (browser) {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const accountsStr = localStorage.getItem('accounts');
      const user = userStr ? JSON.parse(userStr) : null;
      const accounts = accountsStr ? JSON.parse(accountsStr) : [];
      
      return {
        token,
        user,
        accounts,
        isAuthenticated: !!token && !!user
      };
    } catch (e) {
      console.error('Error loading auth state from localStorage:', e);
    }
  }
  
  return {
    token: null,
    user: null,
    accounts: [],
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
    login: (token: string, user: User, refreshToken?: string, accounts: Account[] = []) => {
      // Guardar en localStorage
      if (browser) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accounts', JSON.stringify(accounts));
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Actualizar el store
      set({
        token,
        refreshToken: refreshToken || null,
        user,
        accounts,
        isAuthenticated: true
      });
    },
    
    // Método para cerrar sesión
    logout: () => {
      // Limpiar localStorage
      if (browser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('accounts');
        localStorage.removeItem('refreshToken');
      }
      
      // Limpiar store de company
      company.clear();
      
      // Actualizar el store
      set({
        token: null,
        refreshToken: null,
        user: null,
        accounts: [],
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
    
    // Método para actualizar las cuentas
    updateAccounts: (accounts: Account[]) => {
      update(state => {
        if (browser) {
          localStorage.setItem('accounts', JSON.stringify(accounts));
        }
        return {
          ...state,
          accounts
        };
      });
    },
    
    // Método para obtener la cuenta primaria
    getPrimaryAccount: () => {
      const state = getInitialState();
      return state.accounts.find(account => account.isPrimary) || state.accounts[0] || null;
    }
  };
}

// Exportar el store
export const auth = createAuthStore(); 