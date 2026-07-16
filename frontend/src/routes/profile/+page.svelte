<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { theme } from '$lib/stores/theme';
  import { ArrowLeftRight, Bell, Code, CreditCard, DollarSign, Globe, History, Key, Moon, RefreshCw, Repeat, ShieldAlert, ShieldCheck, Smartphone, Store, Sun, User, Wallet, Webhook } from '@lucide/svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import { getRoleLabel } from '$lib/helpers';

  const languages = [{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }];
  function handleThemeToggle() { theme.toggle(); }
  function handleLogout() { auth.logout(); goto('/auth/login'); }

  const userProfile = {
    name: $auth.user?.fullName || 'Usuario',
    email: $auth.user?.email || 'usuario@ejemplo.com',
    phone: '+591 77712345',
    role: getRoleLabel($auth.user?.role),
    status: $auth.user?.status || 'active',
    lastLogin: new Date().toISOString(),
    memberSince: '2023-01-15T10:30:00',
    avatarUrl: null as string | null
  };

  let fileInput: HTMLInputElement | undefined;
  function openImageUpload() { fileInput?.click(); }
  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) { userProfile.avatarUrl = URL.createObjectURL(file); target.value = ''; }
  }
</script>

<div class="page">
  <div class="profile-card">
    <button class="avatar-wrap" onclick={openImageUpload} aria-label="Cambiar foto de perfil">
      <div class="avatar-circle">{#if userProfile.avatarUrl}<img src={userProfile.avatarUrl} alt="Avatar" class="avatar-img" />{:else}<span class="avatar-letter">{userProfile.name.charAt(0).toUpperCase()}</span>{/if}</div>
      <div class="avatar-overlay"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg></div>
    </button>
    <div class="profile-info"><h2 class="profile-name">{userProfile.name}</h2><span class="profile-role">{userProfile.role}</span></div>
  </div>

  <div class="menu-group"><div class="menu-title">Acceso rápido</div>
    <button class="menu-item" onclick={() => goto('/transactions')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><History size={18} /></div><div class="menu-text"><span class="menu-label">Historial de transacciones</span><span class="menu-desc">Todas tus transacciones en un solo lugar</span></div></button>
    <button class="menu-item" onclick={() => goto('/wallet')}><div class="menu-icon" style="background:rgba(var(--success-rgb),0.15);color:rgba(var(--success-rgb),1)"><Wallet size={18} /></div><div class="menu-text"><span class="menu-label">Mis Billeteras</span><span class="menu-desc">Gestiona tus wallets y respaldos</span></div></button>
  </div>
  <div class="menu-group"><div class="menu-title">Cuenta</div>
    <button class="menu-item" onclick={() => goto('/profile/account-details')}><div class="menu-icon"><User size={18} /></div><div class="menu-text"><span class="menu-label">Información personal</span><span class="menu-desc">Ver y editar detalles de tu cuenta</span></div></button>
    <button class="menu-item" onclick={() => goto('/profile/cuentas')}><div class="menu-icon" style="background:rgba(var(--success-rgb),0.15);color:rgba(var(--success-rgb),1)"><CreditCard size={18} /></div><div class="menu-text"><span class="menu-label">Mis Cuentas</span><span class="menu-desc">Ver saldos y detalles de tus cuentas</span></div></button>
    <button class="menu-item" onclick={() => goto('/payment-methods')}><div class="menu-icon" style="background:rgba(var(--primary-rgb), 0.15);color:var(--primary)"><CreditCard size={18} /></div><div class="menu-text"><span class="menu-label">Métodos de retiro</span><span class="menu-desc">Configura a qué bancos retirar tu dinero</span></div></button>
  </div>
  <div class="menu-group"><div class="menu-title">Pagos y Transferencias</div>
    <button class="menu-item" onclick={() => goto('/transfers')}><div class="menu-icon"><ArrowLeftRight size={18} /></div><div class="menu-text"><span class="menu-label">Transferencias</span><span class="menu-desc">P2P, pagos compartidos, suscripciones</span></div></button>
    <button class="menu-item" onclick={() => goto('/merchants')}><div class="menu-icon" style="background:rgba(var(--success-rgb),0.15);color:rgba(var(--success-rgb),1)"><Store size={18} /></div><div class="menu-text"><span class="menu-label">Comercios</span><span class="menu-desc">Registra tu comercio y recibe pagos QR</span></div></button>
    <button class="menu-item" onclick={() => goto('/subscriptions')}><div class="menu-icon" style="background:rgba(var(--warning-rgb),0.15);color:rgba(var(--warning-rgb),1)"><Repeat size={18} /></div><div class="menu-text"><span class="menu-label">Suscripciones</span><span class="menu-desc">Pagos recurrentes automáticos</span></div></button>
    <button class="menu-item" onclick={() => goto('/cash')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><DollarSign size={18} /></div><div class="menu-text"><span class="menu-label">Cash in / Cash out</span><span class="menu-desc">Deposita o retira efectivo con agentes</span></div></button>
    <button class="menu-item" onclick={() => goto('/nfc')}><div class="menu-icon" style="background:rgba(var(--secondary-rgb),0.15);color:rgba(var(--secondary-rgb),1)"><Smartphone size={18} /></div><div class="menu-text"><span class="menu-label">Pagos NFC</span><span class="menu-desc">Pagos sin contacto sin internet</span></div></button>
  </div>
  <div class="menu-group"><div class="menu-title">Seguridad</div>
    <button class="menu-item" onclick={() => goto('/profile/cambiar-clave')}><div class="menu-icon" style="background:rgba(var(--warning-rgb),0.15);color:rgba(var(--warning-rgb),1)"><Key size={18} /></div><div class="menu-text"><span class="menu-label">Cambiar contraseña</span><span class="menu-desc">Actualiza tu contraseña de acceso</span></div></button>
    <button class="menu-item" onclick={() => goto('/profile/api-keys')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><Code size={18} /></div><div class="menu-text"><span class="menu-label">API Keys</span><span class="menu-desc">Gestiona tus claves de integración</span></div></button>
    <button class="menu-item" onclick={() => goto('/kyc')}><div class="menu-icon" style="background:rgba(var(--success-rgb),0.15);color:rgba(var(--success-rgb),1)"><ShieldCheck size={18} /></div><div class="menu-text"><span class="menu-label">Verificación KYC</span><span class="menu-desc">Verifica tu identidad para aumentar límites</span></div></button>
    <button class="menu-item" onclick={() => goto('/notifications')}><div class="menu-icon" style="background:rgba(var(--error-rgb),0.15);color:rgba(var(--error-rgb),1)"><Bell size={18} /></div><div class="menu-text"><span class="menu-label">Notificaciones</span><span class="menu-desc">Centro de notificaciones</span></div></button>
    <button class="menu-item" onclick={() => goto('/payment-methods')}><div class="menu-icon" style="background:rgba(var(--primary-rgb), 0.15);color:var(--primary)"><CreditCard size={18} /></div><div class="menu-text"><span class="menu-label">Métodos de Pago</span><span class="menu-desc">Gestiona tus cuentas y tarjetas</span></div></button>
  </div>
  <div class="menu-group"><div class="menu-title">Herramientas</div>
    <button class="menu-item" onclick={() => goto('/fx')}><div class="menu-icon" style="background:rgba(var(--info-rgb),0.15);color:rgba(var(--info-rgb),1)"><ArrowLeftRight size={18} /></div><div class="menu-text"><span class="menu-label">Tasas de cambio</span><span class="menu-desc">Conversión de moneda y FX rates</span></div></button>
    <button class="menu-item" onclick={() => goto('/fraud')}><div class="menu-icon" style="background:rgba(var(--error-rgb),0.15);color:rgba(var(--error-rgb),1)"><ShieldAlert size={18} /></div><div class="menu-text"><span class="menu-label">Alertas de seguridad</span><span class="menu-desc">Alertas de fraude y actividad sospechosa</span></div></button>
    <button class="menu-item" onclick={() => goto('/webhooks')}><div class="menu-icon" style="background:rgba(var(--secondary-rgb),0.15);color:rgba(var(--secondary-rgb),1)"><Webhook size={18} /></div><div class="menu-text"><span class="menu-label">Webhooks</span><span class="menu-desc">Integración con servicios externos</span></div></button>
    <button class="menu-item" onclick={() => goto('/reconciliation')}><div class="menu-icon" style="background:rgba(var(--warning-rgb),0.15);color:rgba(var(--warning-rgb),1)"><RefreshCw size={18} /></div><div class="menu-text"><span class="menu-label">Reconciliación</span><span class="menu-desc">Reconciliación de cuentas bancarias</span></div></button>
  </div>
  <div class="menu-group"><div class="menu-title">Preferencias</div>
    <button class="menu-item" onclick={handleThemeToggle}><div class="menu-icon" style="background:rgba(var(--secondary-rgb),0.15);color:rgba(var(--secondary-rgb),1)">{#if $theme === 'dark'}<Sun size={18} />{:else}<Moon size={18} />{/if}</div><div class="menu-text"><span class="menu-label">Tema</span><span class="menu-desc">{$theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}</span></div><div class="theme-toggle" class:dark={$theme === 'dark'}><div class="theme-knob" class:dark={$theme === 'dark'}></div></div></button>
    <div class="menu-item"><div class="menu-icon" style="background:rgba(var(--primary-rgb), 0.1);color:var(--primary)"><Globe size={18} /></div><div class="menu-text"><span class="menu-label">Idioma</span><span class="menu-desc">Selecciona tu idioma preferido</span></div><div class="lang-group"><button class="lang-btn active" aria-label="Español">ES</button><button class="lang-btn disabled" disabled aria-label="English">EN</button></div></div>
  </div>
  <div class="footer"><div class="footer-links"><button class="footer-link" onclick={() => goto('/support')}>Soporte</button><span class="footer-dot">•</span><button class="footer-link" onclick={() => goto('/terms')}>Términos</button><span class="footer-dot">•</span><button class="footer-link" onclick={() => goto('/privacy')}>Privacidad</button></div><PillButton label="Cerrar sesión" onClick={handleLogout} /><p class="footer-version">Pagui • Versión 1.0.0</p></div>
</div>
<input type="file" bind:this={fileInput} accept="image/*" onchange={handleImageUpload} style="display:none" />

<style>
  .page { max-width: 480px; margin: 0 auto; width: 100%; padding: var(--space-4); padding-bottom: calc(80px + var(--nav-bottom)); display: flex; flex-direction: column; gap: var(--space-5); }
  .profile-card { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-5); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-2xl); border: 1px solid rgba(var(--border-rgb), 0.5); }
  .avatar-wrap { width: 72px; height: 72px; border-radius: 50%; padding: 3px; flex-shrink: 0; border: none; cursor: pointer; background: rgba(var(--primary-rgb), 0.3); position: relative; }
  .avatar-wrap:active { opacity: 0.8; }
  .avatar-circle { width: 100%; height: 100%; border-radius: 50%; background: rgba(var(--bg-rgb), 1); color: var(--primary); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .avatar-letter { font-size: 1.75rem; font-weight: 700; }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-overlay { position: absolute; inset: 3px; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity var(--duration-fast); pointer-events: none; }
  .avatar-wrap:hover .avatar-overlay { opacity: 1; }
  .profile-info { flex: 1; min-width: 0; }
  .profile-name { font-size: var(--text-xl); font-weight: 700; margin: 0 0 var(--space-1) 0; letter-spacing: var(--tracking-tight); color: rgba(var(--text-primary-rgb), 1); }
  .profile-role { display: inline-block; padding: var(--space-1) var(--space-3); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(var(--primary-rgb), 0.1); color: var(--primary); border-radius: var(--radius-full); }
  .menu-group { display: flex; flex-direction: column; gap: var(--space-1); }
  .menu-title { font-size: var(--text-xs); font-weight: 600; color: rgba(var(--text-tertiary-rgb), 1); text-transform: uppercase; letter-spacing: 0.06em; padding: 0 var(--space-1) var(--space-1); }
  .menu-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: rgba(var(--surface-rgb), 1); border-radius: var(--radius-xl); cursor: pointer; border: none; width: 100%; text-align: left; border: 1px solid rgba(var(--border-rgb), 0.3); }
  .menu-item:active { border-color: rgba(var(--primary-rgb), 0.6); }
  .menu-icon { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(var(--surface-rgb), 0.5); color: rgba(var(--text-secondary-rgb), 1); }
  .menu-text { flex: 1; min-width: 0; }
  .menu-label { display: block; font-weight: 600; font-size: var(--text-sm); color: rgba(var(--text-primary-rgb), 1); margin-bottom: 2px; }
  .menu-desc { display: block; font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); }
  .theme-toggle { width: 48px; height: 26px; border-radius: 13px; position: relative; flex-shrink: 0; background: rgba(var(--border-rgb), 0.5); }
  .theme-toggle.dark { background: var(--primary); }
  .theme-knob { width: 22px; height: 22px; border-radius: 50%; background: rgba(var(--bg-rgb), 1); position: absolute; top: 2px; left: 2px; }
  .theme-knob.dark { transform: translateX(22px); }
  .lang-group { display: flex; gap: var(--space-2); flex-shrink: 0; }
  .lang-btn { min-width: 40px; height: 32px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 600; border: none; padding: 0 12px; cursor: pointer; }
  .lang-btn.active { background: var(--primary); color: rgba(var(--bg-rgb), 1); }
  .lang-btn.disabled { background: rgba(var(--border-rgb), 0.5); color: rgba(var(--text-tertiary-rgb), 1); opacity: 0.7; cursor: not-allowed; }
  .footer { display: flex; flex-direction: column; gap: var(--space-4); padding-top: var(--space-4); border-top: 1px solid rgba(var(--border-rgb), 0.3); align-items: center; }
  .footer-links { display: flex; align-items: center; gap: var(--space-2); }
  .footer-link { background: none; border: none; color: var(--primary); font-size: var(--text-sm); padding: var(--space-2); cursor: pointer; font-weight: 500; }
  .footer-dot { color: rgba(var(--text-tertiary-rgb), 1); font-size: var(--text-xs); }
  .footer-version { font-size: var(--text-xs); color: rgba(var(--text-secondary-rgb), 1); opacity: 0.7; margin: 0; text-align: center; }
</style>
