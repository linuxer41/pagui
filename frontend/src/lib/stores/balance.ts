import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { onSSEEvent, type AccountBalanceUpdateEvent } from '$lib/services/sseService'

export interface BalanceState {
  balance: number
  availableBalance: number
  currency: string
  previousBalance: number | null
  updatedAt: string | null
}

function createBalanceStore() {
  const { subscribe, set, update } = writable<BalanceState>({
    balance: 0,
    availableBalance: 0,
    currency: 'BOB',
    previousBalance: null,
    updatedAt: null,
  })

  let unsubscribe: (() => void) | null = null

  if (browser) {
    unsubscribe = onSSEEvent('account_balance_update', (data: AccountBalanceUpdateEvent) => {
      update(state => ({
        ...state,
        balance: data.newBalance,
        availableBalance: data.newAvailableBalance,
        previousBalance: data.previousBalance,
        currency: data.currency,
        updatedAt: new Date().toISOString(),
      }))
    })
  }

  return {
    subscribe,
    setBalances: (balance: number, availableBalance: number, currency = 'BOB') => {
      update(state => ({
        ...state,
        balance,
        availableBalance,
        currency,
        previousBalance: state.balance !== balance ? state.balance : state.previousBalance,
        updatedAt: new Date().toISOString(),
      }))
    },
    reset: () => {
      set({ balance: 0, availableBalance: 0, currency: 'BOB', previousBalance: null, updatedAt: null })
    },
    cleanup: () => {
      unsubscribe?.()
    },
  }
}

export const balanceStore = createBalanceStore()
