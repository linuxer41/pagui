<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import { auth } from '$lib/stores/auth';
  import { theme } from '$lib/stores/theme';
  import {
      ArrowLeftRight,
      Bell,
      ChevronRight,
      Code,
      CreditCard,
      DollarSign,
      Globe,
      Key,
      LogOut,
      Moon,
      RefreshCw,
      Repeat,
      ShieldAlert,
      ShieldCheck,
      Smartphone,
      Store,
      Sun,
      User,
      Wallet,
      Webhook
  } from '@lucide/svelte';

  const languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' }
  ];

  function handleThemeToggle() {
    theme.toggle();
  }

  function handleLogout() {
    auth.logout();
    goto('/auth/login');
  }

  const userProfile = {
    name: $auth.user?.fullName || 'Usuario',
    email: $auth.user?.email || 'usuario@ejemplo.com',
    phone: '+591 77712345',
    role: $auth.user?.roleName || 'Usuario',
    status: $auth.user?.status || 'active',
    lastLogin: new Date().toISOString(),
    memberSince: '2023-01-15T10:30:00',
    avatarUrl: null as string | null
  };

  let fileInput: HTMLInputElement | undefined;

  function openImageUpload() {
    if (fileInput) {
      fileInput.click();
    }
  }

  function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      userProfile.avatarUrl = imageUrl;
      target.value = '';
    }
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
</script>

<div class="page-header">
  <span class="page-header-title">Mi Cuenta</span>
</div>

<div class="page-content" style="display:flex;flex-direction:column;gap:var(--space-4);padding-bottom:calc(100px + var(--nav-bottom))">
  <!-- Profile Card -->
  <div class="section-card" style="display:flex;flex-direction:column;gap:var(--space-4);overflow:hidden">
    <div style="display:flex;align-items:center;gap:var(--space-4)">
      <button onclick={openImageUpload} type="button" aria-label="Cambiar foto de perfil" style="width:80px;height:80px;border-radius:50%;padding:3px;flex-shrink:0;border:none;cursor:pointer;background:var(--primary-gradient);position:relative;transition:transform var(--duration-fast) var(--ease-out)">
        <div style="width:100%;height:100%;border-radius:50%;background:var(--bg-primary);color:var(--primary-color);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;overflow:hidden;box-shadow:var(--shadow-card)">
          {#if userProfile.avatarUrl}
            <img src={userProfile.avatarUrl} alt="Avatar de {userProfile.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
          {:else}
            {userProfile.name.charAt(0).toUpperCase()}
          {/if}
        </div>
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity var(--duration-fast) var(--ease-out);pointer-events:none;font-size:1.5rem">📷</div>
      </button>
      <div style="flex:1;min-width:0">
        <h1 style="font-size:var(--text-2xl);font-weight:700;margin:0 0 var(--space-2) 0;letter-spacing:var(--tracking-tight);color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{userProfile.name}</h1>
        <span class="badge-primary" style="display:inline-flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">👤 {userProfile.role}</span>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/profile/account-details')} aria-label="Ver detalles de la cuenta">
      <div style="width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-subtle);color:var(--primary-color)"><User size={20} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);margin-bottom:2px">Información personal</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin:0">Ver y editar detalles de tu cuenta</div>
      </div>
      <ChevronRight size={18} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/profile/cuentas')} aria-label="Ver mis cuentas">
      <div style="width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;--bg:#dcfce7;--fg:#16a34a;background:var(--bg);color:var(--fg)"><CreditCard size={20} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);margin-bottom:2px">Mis Cuentas</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin:0">Ver saldos y detalles de tus cuentas</div>
      </div>
      <ChevronRight size={18} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/payment-methods')} aria-label="Gestionar métodos de pago">
      <div style="width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#10b981"><CreditCard size={20} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary);margin-bottom:2px">Métodos de retiro</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin:0">Configura a qué bancos retirar tu dinero</div>
      </div>
      <ChevronRight size={18} style="color:var(--text-tertiary)" />
    </button>
  </div>

  <!-- Pagos y Transferencias -->
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-left:var(--space-1)">Pagos y Transferencias</div>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/transfers')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-subtle);color:var(--primary-color)"><ArrowLeftRight size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Transferencias</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">P2P, pagos compartidos, suscripciones</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/merchants')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#dcfce7;color:#16a34a"><Store size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Comercios</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Registra tu comercio y recibe pagos QR</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/subscriptions')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fef3c7;color:#d97706"><Repeat size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Suscripciones</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Pagos recurrentes automáticos</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/cash')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#e0f2fe;color:#0284c7"><DollarSign size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Cash in / Cash out</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Deposita o retira efectivo con agentes</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/nfc')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f3e8ff;color:#9333ea"><Smartphone size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Pagos NFC</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Pagos sin contacto sin internet</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
  </div>

  <!-- Seguridad -->
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-left:var(--space-1)">Seguridad</div>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/profile/cambiar-clave')} aria-label="Cambiar contraseña">
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fef3c7;color:#d97706"><Key size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Cambiar contraseña</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Actualiza tu contraseña de acceso</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/profile/api-keys')} aria-label="Gestionar API Keys">
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#e0f2fe;color:#0284c7"><Code size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">API Keys</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Gestiona tus claves de integración</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/profile/biometric')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f3e8ff;color:#9333ea"><Smartphone size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Autenticación biométrica</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Registra huella o face ID</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/kyc')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#dcfce7;color:#16a34a"><ShieldCheck size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Verificación KYC</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Verifica tu identidad para aumentar límites</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/notifications')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fee2e2;color:#dc2626"><Bell size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Notificaciones</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Centro de notificaciones</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/payment-methods')} aria-label="Gestionar métodos de pago">
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-subtle);color:var(--primary-color)"><CreditCard size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Métodos de Pago</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Gestiona tus cuentas y tarjetas</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
  </div>

  <!-- Herramientas -->
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-left:var(--space-1)">Herramientas</div>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/wallet')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-subtle);color:var(--primary-color)"><Wallet size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Billeteras</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Gestiona tus wallets y respaldos</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/fx')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#e0f2fe;color:#0284c7"><ArrowLeftRight size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Tasas de cambio</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Conversión de moneda y FX rates</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/fraud')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fee2e2;color:#dc2626"><ShieldAlert size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Alertas de seguridad</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Alertas de fraude y actividad sospechosa</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/webhooks')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f3e8ff;color:#9333ea"><Webhook size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Webhooks</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Integración con servicios externos</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={() => goto('/reconciliation')}>
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fef3c7;color:#d97706"><RefreshCw size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Reconciliación</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Reconciliación de cuentas bancarias</div>
      </div>
      <ChevronRight size={16} style="color:var(--text-tertiary)" />
    </button>
  </div>

  <!-- Preferencias -->
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-left:var(--space-1)">Preferencias</div>
    <button class="section-card" style="display:flex;align-items:center;gap:var(--space-4);cursor:pointer;border:none;width:100%;text-align:left" onclick={handleThemeToggle} aria-label="Cambiar tema">
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f3e8ff;color:#9333ea">
        {#if $theme === 'dark'}
          <Sun size={18} />
        {:else}
          <Moon size={18} />
        {/if}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Tema</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">{$theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}</div>
      </div>
      <div style="width:48px;height:26px;border-radius:13px;position:relative;transition:all var(--duration-fast) var(--ease-out);flex-shrink:0;background:{$theme === 'dark' ? 'var(--primary-color)' : '#e2e8f0'};box-shadow:inset 0 1px 3px rgba(0,0,0,0.1)">
        <div style="width:22px;height:22px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;transition:all var(--duration-fast) var(--ease-out);box-shadow:var(--shadow-xs);transform:{$theme === 'dark' ? 'translateX(22px)' : 'none'}"></div>
      </div>
    </button>
    <div class="section-card" style="display:flex;align-items:center;gap:var(--space-4)">
      <div style="width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-subtle);color:var(--primary-color)"><Globe size={18} /></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:var(--text-sm);color:var(--text-primary)">Idioma</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">Selecciona tu idioma preferido</div>
      </div>
      <div style="display:flex;gap:var(--space-2);flex-shrink:0">
        <button style="min-width:40px;height:32px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:600;border:none;padding:0 12px;cursor:pointer;background:var(--primary-color);color:white;box-shadow:var(--shadow-xs)" aria-pressed="true" aria-label="Español">ES</button>
        <button style="min-width:40px;height:32px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:600;border:none;padding:0 12px;cursor:not-allowed;background:var(--border);color:var(--text-tertiary);opacity:0.7" disabled aria-pressed="false" aria-label="English (próximamente)">EN</button>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="display:flex;flex-direction:column;gap:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--border)">
    <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-2);flex-wrap:wrap">
      <button style="background:none;border:none;color:var(--primary-color);font-size:var(--text-sm);padding:0.5rem;cursor:pointer;font-weight:500" onclick={() => goto('/support')}>Soporte</button>
      <span style="color:var(--text-tertiary);font-size:var(--text-xs)">•</span>
      <button style="background:none;border:none;color:var(--primary-color);font-size:var(--text-sm);padding:0.5rem;cursor:pointer;font-weight:500" onclick={() => goto('/terms')}>Términos</button>
      <span style="color:var(--text-tertiary);font-size:var(--text-xs)">•</span>
      <button style="background:none;border:none;color:var(--primary-color);font-size:var(--text-sm);padding:0.5rem;cursor:pointer;font-weight:500" onclick={() => goto('/privacy')}>Privacidad</button>
    </div>
    <div style="display:flex;justify-content:center">
      <Button onclick={handleLogout} icon={LogOut} variant="ghost" fullWidth={false} size="lg">Cerrar sesión</Button>
    </div>
    <div style="text-align:center">
      <p style="font-size:var(--text-xs);color:var(--text-secondary);opacity:0.7;margin:0">Pagui • Versión 1.0.0</p>
    </div>
  </div>
</div>

<input
  type="file"
  bind:this={fileInput}
  accept="image/*"
  onchange={handleImageUpload}
  style="display: none;"
/>
