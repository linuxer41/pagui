<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let icon: string;
  export let title: string;
  export let price: string;
  export let subtitle: string;
  export let features: string[];
  export let ctaText: string;
  export let featured: boolean = false;
  export let delay: number = 0;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('click', { title, price });
  }
</script>

<div 
  class="pricing-card fade-in"
  class:featured
  style="animation-delay: {delay}ms;"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  {#if featured}
    <div class="pricing-badge">Más Popular</div>
  {/if}
  
  <div class="pricing-header">
    <div class="pricing-icon">{icon}</div>
    <h3>{title}</h3>
    <div class="price">{price}</div>
    <p class="price-subtitle">{subtitle}</p>
  </div>
  
  <div class="pricing-features">
    {#each features as feature}
      <div class="pricing-feature">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>{feature}</span>
      </div>
    {/each}
  </div>
  
  <div class="pricing-cta">
    <button class="btn btn-primary btn-large">
      <span>{ctaText}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  </div>
  
  <!-- Efectos de elevación -->
  <div class="elevation-effect"></div>
  <div class="glow-effect"></div>
</div>

<style>
  .pricing-card {
    background: white;
    border-radius: 28px;
    padding: var(--space-xl);
    box-shadow: 
      0 8px 30px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.06);
    border: 2px solid transparent;
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transform: translateY(0) scale(1);
  }
  
  .pricing-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, rgb(var(--primary)), rgb(var(--purple)));
    transform: scaleX(0);
    transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .pricing-card:hover {
    transform: translateY(-12px) scale(1.02);
    box-shadow: 
      0 25px 50px rgba(var(--primary), 0.15),
      0 15px 30px rgba(0, 0, 0, 0.1);
    border-color: rgba(var(--primary-light), 0.4);
  }
  
  .pricing-card:hover::before {
    transform: scaleX(1);
  }
  
  .pricing-card:focus {
    outline: none;
    box-shadow: 
      0 0 0 3px rgba(var(--primary), 0.2),
      0 25px 50px rgba(var(--primary), 0.15);
  }
  
  .pricing-card.featured {
    border-color: rgb(var(--primary));
    transform: scale(1.05);
    box-shadow: 
      0 12px 40px rgba(var(--primary), 0.2),
      0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .pricing-card.featured:hover {
    transform: scale(1.05) translateY(-12px);
  }
  
  .pricing-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgb(var(--primary)), rgb(var(--purple)));
    color: white;
    padding: var(--space-xs) var(--space-lg);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 10;
    box-shadow: 0 4px 15px rgba(var(--primary), 0.3);
  }
  
  .pricing-header {
    text-align: center;
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
  }
  
  .pricing-icon {
    font-size: 3.5rem;
    margin-bottom: var(--space);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
  
  .pricing-header h3 {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
    transition: color 0.3s ease;
  }
  
  .pricing-card:hover .pricing-header h3 {
    color: rgb(var(--primary-dark));
  }
  
  .price {
    font-size: 2.8rem;
    font-weight: 800;
    color: rgb(var(--primary));
    margin-bottom: var(--space-xs);
    background: linear-gradient(135deg, rgb(var(--primary)), rgb(var(--purple)));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .price-subtitle {
    color: rgb(var(--gray-600));
    font-size: 0.95rem;
    font-weight: 500;
  }
  
  .pricing-features {
    margin-bottom: var(--space-xl);
    position: relative;
    z-index: 1;
  }
  
  .pricing-feature {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space);
    color: rgb(var(--gray-700));
    transition: all 0.3s ease;
  }
  
  .pricing-feature:hover {
    color: rgb(var(--primary-dark));
    transform: translateX(4px);
  }
  
  .pricing-feature svg {
    color: rgb(var(--success));
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }
  
  .pricing-feature:hover svg {
    transform: scale(1.1);
  }
  
  .pricing-cta {
    text-align: center;
    position: relative;
    z-index: 1;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .btn-primary {
    background: var(--gradient-primary);
    color: white;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(var(--primary), 0.3);
  }
  
  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(var(--primary), 0.4);
  }
  
  .btn-primary:hover::before {
    left: 100%;
  }
  
  .btn-large {
    padding: var(--space) var(--space-lg);
    font-size: 1rem;
  }
  
  /* Efectos de elevación */
  .elevation-effect {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(var(--primary), 0.08) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  
  .pricing-card:hover .elevation-effect {
    opacity: 1;
  }
  
  .glow-effect {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(var(--primary), 0.08) 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.5s ease;
    pointer-events: none;
  }
  
  .pricing-card:hover .glow-effect {
    transform: translate(-50%, -50%) scale(1.5);
  }
  
  /* Animación de entrada */
  .fade-in {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
    animation: fadeInUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .pricing-card {
      padding: var(--space-lg);
      border-radius: 24px;
    }
    
    .pricing-card.featured {
      transform: none;
    }
    
    .pricing-card.featured:hover {
      transform: translateY(-8px);
    }
    
    .pricing-card:hover {
      transform: translateY(-8px) scale(1.01);
    }
    
    .price {
      font-size: 2.4rem;
    }
  }
</style>
