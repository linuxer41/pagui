<script lang="ts">
  import { goto } from '$app/navigation'
  import Section from '$lib/components/Section.svelte';
  import {
    ArrowUpRight, CreditCard, RefreshCw, Users, Smartphone, DollarSign,
    Repeat, Calendar, Shield, Wallet, Building2, Bell, Receipt, Banknote, Landmark
  } from '@lucide/svelte'

  interface MenuItem {
    icon: any; iconBg: string; iconColor: string;
    label: string; desc: string; href: string;
  }

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Pagos y transferencias',
      items: [
        { icon: ArrowUpRight, iconBg: 'rgba(13,148,136,0.15)', iconColor: 'rgba(13,148,136,1)', label: 'Transferir', desc: 'Envío de dinero P2P', href: '/transfers' },
        { icon: Users, iconBg: 'rgba(245,158,11,0.15)', iconColor: 'rgba(245,158,11,1)', label: 'Pago compartido', desc: 'Divide cuentas', href: '/split' },
        { icon: Calendar, iconBg: 'rgba(124,58,237,0.15)', iconColor: 'rgba(124,58,237,1)', label: 'Suscripciones', desc: 'Pagos recurrentes', href: '/subscriptions' },
        { icon: CreditCard, iconBg: 'rgba(219,39,119,0.15)', iconColor: 'rgba(219,39,119,1)', label: 'Pago en comercios', desc: 'Paga en establecimientos', href: '/merchants' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { icon: DollarSign, iconBg: 'rgba(16,185,129,0.15)', iconColor: 'rgba(16,185,129,1)', label: 'Cash', desc: 'Deposita o retira efectivo', href: '/cash' },
        { icon: Smartphone, iconBg: 'rgba(79,70,229,0.15)', iconColor: 'rgba(79,70,229,1)', label: 'NFC', desc: 'Pagos sin contacto', href: '/nfc' },
        { icon: Repeat, iconBg: 'rgba(245,158,11,0.15)', iconColor: 'rgba(245,158,11,1)', label: 'Divisas', desc: 'Tasas de cambio', href: '/fx' },
      ],
    },
    {
      title: 'Seguridad y configuración',
      items: [
        { icon: Shield, iconBg: 'rgba(16,185,129,0.15)', iconColor: 'rgba(16,185,129,1)', label: 'KYC', desc: 'Verificación de identidad', href: '/kyc' },
        { icon: Bell, iconBg: 'rgba(219,39,119,0.15)', iconColor: 'rgba(219,39,119,1)', label: 'Notificaciones', desc: 'Centro de notificaciones', href: '/notifications' },
        { icon: Receipt, iconBg: 'rgba(124,58,237,0.15)', iconColor: 'rgba(124,58,237,1)', label: 'Webhooks', desc: 'Integraciones API', href: '/webhooks' },
        { icon: RefreshCw, iconBg: 'rgba(79,70,229,0.15)', iconColor: 'rgba(79,70,229,1)', label: 'Reconciliación', desc: 'Conciliaciones bancarias', href: '/reconciliation' },
        { icon: Landmark, iconBg: 'rgba(234,88,12,0.15)', iconColor: 'rgba(234,88,12,1)', label: 'Conexión bancaria', desc: 'Registra tu cuenta Baneco', href: '/profile/banking' },
        { icon: Banknote, iconBg: 'rgba(22,163,74,0.15)', iconColor: 'rgba(22,163,74,1)', label: 'Liquidaciones', desc: 'Cobros QR recibidos', href: '/settlements' },
      ],
    },
  ]
</script>

<div class="more-page">
  <div class="hero-section">
    <h1 class="hero-title">Más</h1>
    <p class="hero-sub">Todas tus operaciones</p>
  </div>

  {#each sections as section}
    <Section label={section.title}>
      <div class="menu-grid">
        {#each section.items as item}
          <button class="menu-item" onclick={() => goto(item.href)}>
            <div class="menu-item-icon" style="background: {item.iconBg}; color: {item.iconColor};">
              <svelte:component this={item.icon} size={20} />
            </div>
            <div class="menu-item-text">
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </div>
          </button>
        {/each}
      </div>
    </Section>
  {/each}
</div>

<style>
  .more-page { min-height: 100dvh; }
  .hero-section { background: var(--primary); color: white; padding: var(--space-4); }
  .hero-title { font-size: var(--text-2xl); font-weight: 800; letter-spacing: var(--tracking-tight); }
  .hero-sub { font-size: var(--text-sm); opacity: 0.8; margin-top: var(--space-1); }
  .menu-grid { display: flex; flex-direction: column; gap: var(--space-1); }
  .menu-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: none; background: none; border-radius: var(--radius-lg); cursor: pointer; text-align: left; width: 100%; }
  .menu-item:active { background: rgba(var(--surface-rgb), 1); }
  .menu-item-icon { width: 40px; height: 40px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .menu-item-text { display: flex; flex-direction: column; gap: 1px; }
  .menu-item-text strong { font-size: var(--text-sm); font-weight: 600; color: rgba(var(--text-primary-rgb), 1); }
  .menu-item-text span { font-size: var(--text-xs); color: rgba(var(--text-tertiary-rgb), 1); }
</style>
