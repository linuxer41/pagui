<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import api from '$lib/api'
  import { auth } from '$lib/stores/auth'
  import { ArrowLeft, AlertCircle } from '@lucide/svelte'

  let step = $state<'phone' | 'otp' | 'onboarding'>('phone')
  let phone = $state('')
  let code = $state('')
  let name = $state('')
  let documentId = $state('')
  let loading = $state(false)
  let error = $state('')
  let countdown = $state(0)
  let timer: ReturnType<typeof setInterval> | null = null
  let tempToken = $state('')
  let slide = $state(0)
  let carouselHeight = $state(0)

  const slides = [
    {
      img: '/images/slide-business.jpg',
      title: 'API de Pagos QR',
      desc: 'Integra cobros con QR a tu sistema de ventas o tienda online. Concilia automáticamente cada transacción vía nuestra API.',
    },
    {
      img: '/images/slide-wallet.jpg',
      title: 'Billetera Móvil',
      desc: 'Tu dinero siempre contigo. Envía, recibe y administra tus fondos desde cualquier lugar.',
    },
    {
      img: '/images/slide-qr.jpg',
      title: 'Pagos NFC',
      desc: 'Paga sin contacto acercando tu teléfono. Rápido, seguro y disponible en comercios afiliados.',
    },
  ]

  let carouselTimer: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    if ($auth.isAuthenticated) goto('/')
    carouselHeight = Math.round(window.innerHeight / 2)
    const updateHeight = () => { carouselHeight = Math.round(window.innerHeight / 2) }
    window.addEventListener('resize', updateHeight)
    carouselTimer = setInterval(() => { slide = (slide + 1) % slides.length }, 5000)
  })

  onDestroy(() => {
    if (timer) clearInterval(timer)
    if (carouselTimer) clearInterval(carouselTimer)
  })

  async function handleSendOTP() {
    if (!phone.trim()) return
    error = ''
    loading = true
    try {
      await api.sendOTP(phone)
      step = 'otp'
      countdown = 60
      timer = setInterval(() => {
        countdown--
        if (countdown <= 0) { if (timer) clearInterval(timer); timer = null }
      }, 1000)
    } catch (err: any) {
      error = err?.message || 'Error al enviar código'
    } finally {
      loading = false
    }
  }

  async function handleVerifyOTP() {
    if (code.length < 6) return
    error = ''
    loading = true
    try {
      const res = await api.loginWithOTP(phone, code)
      const d = res.data
      if (d.needsRegistration && d.tempToken) {
        tempToken = d.tempToken
        step = 'onboarding'
      } else {
        const wallets = (d as any)?.wallets || []
        if (!wallets.length) {
          error = 'Este usuario no tiene una billetera asociada, contacte con el administrador'
          return
        }
        auth.login(d.accessToken, d.user, d.refreshToken, wallets)
        goto('/', { replaceState: true })
      }
    } catch (err: any) {
      error = err?.message || 'Código incorrecto'
    } finally {
      loading = false
    }
  }

  async function handleComplete() {
    if (!name.trim() || !documentId.trim()) return
    error = ''
    loading = true
    try {
      await api.completeOTPRegistration(phone, name, documentId, tempToken)
      goto('/', { replaceState: true })
    } catch (err: any) {
      error = err?.message || 'Error al crear cuenta'
    } finally {
      loading = false
    }
  }

  function back(to: 'phone' | 'otp') {
    step = to
    error = ''
  }
</script>

<div class="login">
  <div class="carousel-section" style="height: {carouselHeight}px">
    <div class="carousel-track" style="transform: translateX(-{slide * 100}%)">
      {#each slides as s, i}
        <div class="carousel-slide">
          <img class="carousel-img" src={s.img} alt={s.title} loading={i === 0 ? 'eager' : 'lazy'} />
          <div class="carousel-overlay" />
          <div class="carousel-content">
            <h2 class="carousel-title">{s.title}</h2>
            <p class="carousel-desc">{s.desc}</p>
          </div>
        </div>
      {/each}
    </div>
    <div class="carousel-dots">
      {#each slides as _, i}
        <button class="dot" class:active={i === slide} onclick={() => { slide = i }} aria-label="Slide {i + 1}" />
      {/each}
    </div>
  </div>

  <div class="bottom-section">
    <div class="brand">
      <h1 class="brand-title">PAGUI</h1>
      <p class="brand-sub">Billetera digital</p>
    </div>

    {#if error}
      <div class="error-bar">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    {/if}

    {#if step === 'phone'}
      <form onsubmit={(e) => { e.preventDefault(); handleSendOTP() }}>
        <div class="phone-compact">
          <span class="phone-prefix">+591</span>
          <input class="phone-input" type="tel" bind:value={phone} placeholder="Teléfono" disabled={loading} autofocus />
        </div>
        <button class="cta-btn" type="submit" disabled={!phone.trim() || loading}>
          {loading ? 'Enviando...' : 'Ingresar con WhatsApp'}
        </button>
      </form>

    {:else if step === 'otp'}
      <form onsubmit={(e) => { e.preventDefault(); handleVerifyOTP() }}>
        <p class="otp-info">Enviamos un código a <strong>+591 {phone}</strong></p>
        <input class="code-input" type="text" inputmode="numeric" maxlength={6} bind:value={code} placeholder="000000" disabled={loading} autofocus />
        <button class="cta-btn" type="submit" disabled={code.length < 6 || loading}>
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
      <div class="otp-actions">
        <button class="text-link" onclick={() => back('phone')}>
          <ArrowLeft size={14} /> Cambiar número
        </button>
        <button class="text-link" disabled={countdown > 0} onclick={handleSendOTP}>
          {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
        </button>
      </div>

    {:else if step === 'onboarding'}
      <form onsubmit={(e) => { e.preventDefault(); handleComplete() }}>
        <p class="otp-info">Completa tus datos para crear tu cuenta</p>
        <div class="field">
          <label class="field-label">Nombre completo</label>
          <input class="text-input" type="text" bind:value={name} placeholder="Ej: Juan Pérez" disabled={loading} autofocus />
        </div>
        <div class="field">
          <label class="field-label">Cédula de identidad</label>
          <input class="text-input" type="text" bind:value={documentId} placeholder="Ej: 1234567" disabled={loading} autofocus />
        </div>
        <button class="cta-btn" type="submit" disabled={!name.trim() || !documentId.trim() || loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .login { display: flex; flex-direction: column; flex: 1; height: 100%; }

  .carousel-section { position: relative; overflow: hidden; }
  .carousel-track { display: flex; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
  .carousel-slide { flex: 0 0 100%; height: 100%; position: relative; overflow: hidden; }
  .carousel-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .carousel-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%); }
  .carousel-content { position: absolute; bottom: var(--space-8); left: var(--space-5); right: var(--space-5); z-index: 1; }
  .carousel-title { font-size: var(--text-xl); font-weight: 800; color: white; margin: 0 0 var(--space-1); text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .carousel-desc { font-size: var(--text-sm); color: rgba(255,255,255,0.85); line-height: 1.4; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .carousel-dots { position: absolute; bottom: var(--space-2); left: 50%; transform: translateX(-50%); display: flex; gap: var(--space-2); z-index: 2; }
  .dot { width: 6px; height: 6px; border-radius: 50%; border: none; cursor: pointer; background: rgba(255,255,255,0.4); padding: 0; transition: all 0.3s; }
  .dot.active { width: 24px; border-radius: 3px; background: white; }

  .bottom-section { padding: var(--space-5) var(--space-5) var(--space-8); display: flex; flex-direction: column; gap: var(--space-4); flex: 1; background: rgba(var(--bg-rgb), 1); }
  .brand { text-align: center; }
  .brand-title { font-size: var(--text-xl); font-weight: 800; color: rgba(var(--text-primary-rgb), 1); margin: 0; letter-spacing: var(--tracking-tight); }
  .brand-sub { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); margin: 2px 0 0; }

  .error-bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: rgba(var(--error-rgb), 0.1); color: rgba(var(--error-rgb), 1); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 500; }

  form { display: flex; flex-direction: column; gap: var(--space-4); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--text-sm); font-weight: 500; color: rgba(var(--text-primary-rgb), 1); }

  .phone-compact { display: flex; align-items: center; gap: 0; border-bottom: 1.5px solid rgba(var(--border-rgb), 1); padding: var(--space-2) 0; }
  .phone-compact:focus-within { border-bottom-color: var(--primary); }
  .phone-prefix { font-size: var(--text-lg); color: rgba(var(--text-secondary-rgb), 1); font-weight: 500; padding-right: var(--space-2); flex-shrink: 0; }
  .phone-input { flex: 1; border: none; background: transparent; font-size: var(--text-lg); color: rgba(var(--text-primary-rgb), 1); outline: none; padding: 0; }
  .phone-input::placeholder { color: rgba(var(--text-tertiary-rgb), 0.5); }

  .text-input { width: 100%; padding: var(--space-3) var(--space-4); font-size: var(--text-base); border: 1px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); outline: none; }
  .text-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15); }

  .otp-info { font-size: var(--text-sm); color: rgba(var(--text-secondary-rgb), 1); margin: 0; }
  .otp-info strong { color: rgba(var(--text-primary-rgb), 1); }
  .code-input { width: 100%; padding: var(--space-4); text-align: center; font-size: var(--text-2xl); font-weight: 700; letter-spacing: 8px; border: 2px solid rgba(var(--border-rgb), 0.3); border-radius: var(--radius-lg); background: rgba(var(--surface-rgb), 1); color: rgba(var(--text-primary-rgb), 1); outline: none; font-family: var(--font-mono, monospace); }
  .code-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15); }
  .code-input::placeholder { color: rgba(var(--text-tertiary-rgb), 0.4); letter-spacing: 4px; }

  .cta-btn { width: 100%; padding: var(--space-4); border: none; border-radius: var(--radius-xl); background: var(--primary); color: var(--primary-foreground); font-size: var(--text-base); font-weight: 700; cursor: pointer; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .otp-actions { display: flex; justify-content: space-between; }
  .text-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: var(--text-sm); font-weight: 500; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 2px; }
  .text-link:disabled { opacity: 0.4; cursor: default; }
</style>
