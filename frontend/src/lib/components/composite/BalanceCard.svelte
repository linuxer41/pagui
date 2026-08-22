<script lang="ts">
  import { Copy } from '@lucide/svelte'

  let { wallets = [] as any[] } = $props()

  let current = $state(0)
  let touchStartX = $state(0)
  let touchStartY = $state(0)
  let touchTranslate = $state(0)
  let swiping = $state(false)
  let snapBack = $state(false)
  let animDir = $state(0)
  let copied = $state(false)

  const threshold = 80
  const peekPx = 40

  function copyNumber() {
    const num = wallets[current]?.walletNumber || wallets[current]?.wallet_number || ''
    if (!num) return
    navigator.clipboard.writeText(num)
    copied = true
    setTimeout(() => copied = false, 1500)
  }

  function norm(n: any) {
    if (!n) return { walletNumber: '', accountName: 'Mi Cuenta', type: 'Cuenta', accountLevel: '', currency: 'BOB', balance: 0, holderName: '' }
    return {
      walletNumber: n.wallet_number || n.walletNumber || '',
      accountName: n.account_name || n.accountName || n.name || 'Mi Cuenta',
      type: n.type || 'Cuenta',
      accountLevel: n.account_level || n.accountLevel || '',
      isCollection: n.isCollection || false,
      currency: n.currency || 'BOB',
      balance: Number(n.balance) || 0,
      holderName: n.holderName || n.holder_name || n.fullName || n.full_name || '',
    }
  }
  let ca = $derived(wallets.length > 0 ? norm(wallets[current]) : null)

  let progress = $derived(swiping || snapBack ? Math.min(Math.abs(touchTranslate) / threshold, 1) : 0)

  function formatCardNum(n: string) {
    if (!n) return '\u2014\u2014\u2014 \u2014\u2014\u2014 \u2014\u2014\u2014'
    const clean = n.replace(/\D/g, '')
    const size = clean.length
    if (size <= 4) return clean
    if (size <= 6) { const m = Math.ceil(size / 2); return clean.slice(0, m) + ' ' + clean.slice(m) }
    const step = size <= 9 ? 3 : 4
    const parts = []
    for (let i = 0; i < size; i += step) parts.push(clean.slice(i, i + step))
    return parts.join(' ')
  }

  function symbol(cur: string) {
    return cur === 'BOB' ? 'Bs' : '$'
  }

  function cardStyle(i: number) {
    const diff = i - current
    if (diff === 0) {
      const tx = swiping || snapBack ? touchTranslate : 0
      const sc = 1 - progress * 0.05
      const transition = snapBack ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : ''
      return `transform: translateX(${tx}px) scale(${sc}); z-index: 3;${transition}`
    }
    if (diff === -1) {
      const tx = swiping || snapBack ? -(peekPx + Math.max(touchTranslate, 0)) : -peekPx
      const sc = 0.92 + progress * 0.08
      const op = 0.6 + progress * 0.4
      const transition = snapBack ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : ''
      return `transform: translateX(${tx}px) scale(${sc}); z-index: 2; opacity: ${op}; pointer-events: none;${transition}`
    }
    if (diff === 1) {
      const tx = swiping || snapBack ? peekPx + Math.max(-touchTranslate, 0) : peekPx
      const sc = 0.92 + progress * 0.08
      const op = 0.6 + progress * 0.4
      const transition = snapBack ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : ''
      return `transform: translateX(${tx}px) scale(${sc}); z-index: 2; opacity: ${op}; pointer-events: none;${transition}`
    }
    return 'display: none'
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    touchTranslate = 0
    swiping = true
    snapBack = false
    animDir = 0
  }
  function handleTouchMove(e: TouchEvent) {
    if (!swiping) return
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY
    if (Math.abs(dx) > Math.abs(dy) * 2.5) {
      touchTranslate = dx
      e.preventDefault()
    }
  }
  function handleTouchEnd() {
    if (!swiping) return
    swiping = false
    const abs = Math.abs(touchTranslate)
    if (abs > threshold) {
      if (touchTranslate < 0 && current < wallets.length - 1) {
        snapBack = true; animDir = 1
        touchTranslate = -threshold
        setTimeout(() => { touchTranslate = 0; snapBack = false; current++; animDir = 0 }, 300)
        return
      }
      if (touchTranslate > 0 && current > 0) {
        snapBack = true; animDir = -1
        touchTranslate = threshold
        setTimeout(() => { touchTranslate = 0; snapBack = false; current--; animDir = 0 }, 300)
        return
      }
    }
    touchTranslate = 0
  }
</script>

<div class="deck-wrap">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="deck" ontouchstart={handleTouchStart} ontouchmove={handleTouchMove} ontouchend={handleTouchEnd}>
    {#if wallets.length === 0}
      <div class="card" style="z-index:3">
        <div class="card-pattern"></div>
        <div class="card-inner">
          <div class="card-row top-row">
            <span class="card-brand">Pagui</span>
            <svg class="card-network" viewBox="0 0 50 30" width="50" height="30"><rect x="2" y="2" width="20" height="26" rx="3" fill="#f7931a" opacity="0.7"/><rect x="28" y="2" width="20" height="26" rx="3" fill="#eb001b" opacity="0.7"/></svg>
          </div>
          <div class="card-chip">
            <svg viewBox="0 0 40 30" width="40" height="30"><rect x="2" y="2" width="36" height="26" rx="4" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/><rect x="6" y="6" width="28" height="18" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/><line x1="20" y1="2" x2="20" y2="28" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/></svg>
          </div>
          <div class="card-number-row"><span class="card-number">{formatCardNum('')}</span></div>
          <div class="card-bottom-row"><div class="card-field"><span class="card-field-label">Titular</span><span class="card-field-value">&mdash;</span></div></div>
        </div>
      </div>
    {:else}
      {#each wallets as w, i}
        <div class="card" style={cardStyle(i)}>
          <div class="card-pattern"></div>
          {#if i === current}<div class="card-glow"></div>{/if}
          <div class="card-inner">
            <div class="card-row top-row">
              <span class="card-brand">Pagui</span>
              <div class="card-top-right">
                {#if w.isCollection}
                  <span class="card-badge">Recaudación</span>
                {:else}
                  <span class="card-level">{w.level || w.type}</span>
                {/if}
                <svg class="card-network" viewBox="0 0 50 30" width="50" height="30"><rect x="2" y="2" width="20" height="26" rx="3" fill="#f7931a" opacity="0.7"/><rect x="28" y="2" width="20" height="26" rx="3" fill="#eb001b" opacity="0.7"/></svg>
              </div>
            </div>
            <div class="card-chip">
              <svg viewBox="0 0 40 30" width="40" height="30"><rect x="2" y="2" width="36" height="26" rx="4" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/><rect x="6" y="6" width="28" height="18" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/><line x1="20" y1="2" x2="20" y2="28" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/></svg>
            </div>
            <div class="card-number-row">
              <span class="card-number">{formatCardNum(w.walletNumber || w.wallet_number || '')}</span>
              {#if i === current}
                <button class="copy-btn" onclick={copyNumber} aria-label="Copiar número de cuenta">
                  {#if copied}<span class="copy-ok">Copiado</span>{:else}<Copy size={14} />{/if}
                </button>
              {/if}
            </div>
            <div class="card-bottom-row">
              <div class="card-field">
                <span class="card-field-label">Titular</span>
                <span class="card-field-value">{w.holderName || w.holder_name || w.fullName || w.full_name || w.name || 'Mi Cuenta'}</span>
              </div>
              <div class="card-field right">
                <span class="card-field-label">Saldo</span>
                <span class="card-field-value">{symbol(w.currency || 'BOB')} {Number(w.balance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  {#if wallets.length > 1}
    <div class="dots">
      {#each wallets as _, i}
        <button class="dot" class:active={i === current} onclick={() => current = i} aria-label="Cuenta {i + 1}"></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .deck-wrap { position: relative; }
  .deck { position: relative; min-height: 260px; height: 260px; touch-action: pan-y; overscroll-behavior-x: none; }
  .card {
    position: absolute; top: 0; left: 0; width: 100%; min-height: 260px;
    border-radius: var(--radius-2xl);
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    user-select: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    will-change: transform, opacity;
  }
  .card-pattern {
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%),
      radial-gradient(circle at 20% 60%, rgba(255,255,255,0.03) 0%, transparent 40%);
    pointer-events: none;
  }
  .card-glow {
    position: absolute; top: -20%; right: -10%; width: 180px; height: 180px;
    border-radius: 50%; background: radial-gradient(circle, rgba(100,180,255,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .card-inner {
    position: relative; padding: var(--space-5);
    display: flex; flex-direction: column; gap: var(--space-3);
    min-height: 200px;
  }
  .card-row { display: flex; align-items: center; justify-content: space-between; }
  .top-row { margin-bottom: var(--space-1); }
  .card-top-right { display: flex; align-items: center; gap: var(--space-2); }
  .card-brand { font-size: var(--text-lg); font-weight: 800; color: white; letter-spacing: var(--tracking-tight); }
  .card-level, .card-badge { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.75); }
  .card-network { opacity: 0.8; }
  .card-chip { margin-top: var(--space-2); }
  .card-number-row { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-2); }
  .card-number { font-size: var(--text-lg); font-family: var(--font-mono, monospace); color: rgba(255,255,255,0.9); letter-spacing: 4px; font-weight: 600; word-spacing: 8px; }
  .copy-btn { background: rgba(255,255,255,0.12); border: none; border-radius: 6px; padding: 4px 8px; color: rgba(255,255,255,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
  .copy-btn:active { background: rgba(255,255,255,0.2); }
  .copy-ok { font-size: 10px; font-weight: 600; color: rgba(var(--success-rgb), 1); white-space: nowrap; }
  .card-bottom-row { display: flex; align-items: flex-end; gap: var(--space-6); margin-top: var(--space-2); flex: 1; }
  .card-field { display: flex; flex-direction: column; gap: 1px; }
  .card-field.right { margin-left: auto; text-align: right; }
  .card-field-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.45); font-weight: 600; }
  .card-field-value { font-size: var(--text-sm); font-weight: 600; color: white; }
  .dots { display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-3); position: relative; z-index: 10; }
  .dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; background: rgba(var(--border-rgb), 0.6); padding: 0; transition: all var(--duration-fast); }
  .dot.active { width: 24px; border-radius: 4px; background: var(--primary); }
</style>
