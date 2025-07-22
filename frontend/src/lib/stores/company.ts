import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Company interface
export interface Company {
  id: number;
  name: string;
  businessId: string;
  contactEmail: string;
  status: string;
}

// Function to get initial state from localStorage
function getInitialState(): Company | null {
  if (browser) {
    try {
      const companyStr = localStorage.getItem('company');
      return companyStr ? JSON.parse(companyStr) : null;
    } catch (e) {
      console.error('Error loading company state from localStorage:', e);
    }
  }
  
  return null;
}

// Create the company store
function createCompanyStore() {
  const initialState = getInitialState();
  const { subscribe, set, update } = writable<Company | null>(initialState);
  
  return {
    subscribe,
    
    // Set company data
    setCompany: (company: Company) => {
      // Save to localStorage
      if (browser) {
        localStorage.setItem('company', JSON.stringify(company));
      }
      
      // Update the store
      set(company);
    },
    
    // Clear company data
    clear: () => {
      // Clear from localStorage
      if (browser) {
        localStorage.removeItem('company');
      }
      
      // Update the store
      set(null);
    },
    
    // Update company data
    updateCompany: (data: Partial<Company>) => {
      update(company => {
        if (!company) return null;
        
        const updatedCompany = { ...company, ...data };
        
        if (browser) {
          localStorage.setItem('company', JSON.stringify(updatedCompany));
        }
        
        return updatedCompany;
      });
    }
  };
}

// Export the store
export const company = createCompanyStore(); 