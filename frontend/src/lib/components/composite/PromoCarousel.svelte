<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { HandCoins, Smartphone, QrCode } from '@lucide/svelte'

  let current = $state(0)
  let timer: ReturnType<typeof setInterval> | null = null
  let direction = $state(1)

  const slides = [
    {
      icon: HandCoins,
      bgGradient: 'linear-gradient(135deg, #065f46, #047857)',
      iconBg: 'rgba(16,185,129,0.2)',
      iconColor: '#10b981',
      title: 'Recaudaciones',
      desc: 'Cobra de forma segura y automatizada. Genera QR, recibe pagos y concilia en tiempo real.',
    },
    {
      icon: Smartphone,
      bgGradient: 'linear-gradient(135deg, #92400e, #d97706)',
      iconBg: 'rgba(245,158,11,0.2)',
      iconColor: '#f59e0b',
      title: 'Billetera Móvil',
      desc: 'Tu dinero siempre contigo. Envía, recibe y administra tus fondos desde cualquier lugar.',
    },
    {
      icon: QrCode,
      bgGradient: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
      iconBg: 'rgba(139,92,246,0.2)',
      iconColor: '#8b5cf6',
      title: 'Pagos QR',
      desc: 'Paga en comercios escaneando un código QR. Rápido, seguro y sin contacto.',
    },
  ]

  function next() {
    direction = 1
    current = (current + 1) % slides.length
  }

  function goTo(i: number) {
    direction = i > current ? 1 : -1
    current = i
    resetTimer()
  }

  function resetTimer() {
    if (timer) clearInterval(timer)
    timer = setInterval(next, 5000)
  }

  onMount(() => {
    timer = setInterval(next, 5000)
  })

  onDestroy(() => {
    if (timer) clearInterval(timer)
  })
</script>

<div class="carousel">
  <div class="track" style="transform: translateX(-{current * 100}%)">
    {#each slides as slide, i}
      <div class="slide" style="background: {slide.bgGradient}">
        <div class="slide-icon" style="background: {slide.iconBg}; color: {slide.iconColor}">
          <svelte:component this={slide.icon} size={28} />
        </div>
        <div class="slide-text">
          <h3 class="slide-title">{slide.title}</h3>
          <p class="slide-desc">{slide.desc}</p>
        </div>
      </div>
    {/each}
  </div>
  <div class="dots">
    {#each slides as _, i}
      <button class="dot" class:active={i === current} onclick={() => goTo(i)} aria-label="Slide {i + 1}" />
    {/each}
  </div>
</div>

<style>
  .carousel { position: relative; width: 100%; overflow: hidden; border-radius: var(--radius-2xl); }
  .track { display: flex; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
  .slide { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-5); min-height: 120px; flex: 0 0 100%; border-radius: var(--radius-2xl); }
  .slide-icon { width: 52px; height: 52px; border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .slide-text { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; }
  .slide-title { font-size: var(--text-base); font-weight: 700; color: white; margin: 0; }
  .slide-desc { font-size: var(--text-xs); color: rgba(255,255,255,0.75); line-height: 1.4; margin: 0; }
  .dots { display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-3); }
  .dot { width: 6px; height: 6px; border-radius: 50%; border: none; cursor: pointer; background: rgba(var(--border-rgb), 0.5); padding: 0; transition: all 0.3s; }
  .dot.active { width: 20px; border-radius: 3px; background: var(--primary); }
</style>
