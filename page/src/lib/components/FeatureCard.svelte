<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let icon: any;
  export let title: string;
  export let description: string;
  export let highlight: string;
  export let delay: number = 0;
  
  const dispatch = createEventDispatcher();
  
  let cardElement: HTMLElement;
  let isVisible = false;
  
  function handleClick() {
    dispatch('click', { title, description });
  }
</script>

<div 
  bind:this={cardElement}
  class="feature-card fade-in"
  style="animation-delay: {delay}ms;"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <div class="feature-icon">
    <svelte:component this={icon} size="28" />
  </div>
  <h3>{title}</h3>
  <p>{description}</p>
  <div class="feature-highlight">{highlight}</div>
  
  <!-- Efectos de elevación -->
  <div class="elevation-effect"></div>
  <div class="glow-effect"></div>
</div>

<style>
  .feature-card {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    padding: var(--space-lg);
    border-radius: 24px;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 1px solid rgba(var(--gray-200), 0.5);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    cursor: pointer;
    transform: translateY(0) scale(1);
  }
  
  .feature-card::before {
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
  
  .feature-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(var(--primary), 0.02) 0%, rgba(var(--purple), 0.02) 100%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-16px) scale(1.03);
    box-shadow: 
      0 25px 50px rgba(var(--primary), 0.15),
      0 10px 20px rgba(0, 0, 0, 0.1);
    border-color: rgba(var(--primary-light), 0.4);
  }
  
  .feature-card:hover::before {
    transform: scaleX(1);
  }
  
  .feature-card:hover::after {
    opacity: 1;
  }
  
  .feature-card:focus {
    outline: none;
    box-shadow: 
      0 0 0 3px rgba(var(--primary), 0.2),
      0 25px 50px rgba(var(--primary), 0.15);
  }
  
  .feature-icon {
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--purple)) 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-lg);
    color: white;
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(var(--primary), 0.2);
  }
  
  .feature-icon::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  
  .feature-card:hover .feature-icon {
    transform: scale(1.2) rotate(12deg);
    box-shadow: 0 15px 35px rgba(var(--primary), 0.4);
  }
  
  .feature-card:hover .feature-icon::before {
    opacity: 1;
  }
  
  .feature-card h3 {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: var(--space);
    color: rgb(var(--gray-900));
    position: relative;
    z-index: 1;
    transition: color 0.3s ease;
  }
  
  .feature-card:hover h3 {
    color: rgb(var(--primary-dark));
  }
  
  .feature-card p {
    color: rgb(var(--gray-600));
    line-height: 1.6;
    margin-bottom: var(--space);
    position: relative;
    z-index: 1;
    transition: color 0.3s ease;
  }
  
  .feature-highlight {
    display: inline-block;
    background: linear-gradient(135deg, rgba(var(--primary), 0.1) 0%, rgba(var(--purple), 0.1) 100%);
    color: rgb(var(--primary-dark));
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid rgba(var(--primary-light), 0.3);
    position: relative;
    z-index: 1;
    transition: all 0.3s ease;
  }
  
  .feature-card:hover .feature-highlight {
    background: linear-gradient(135deg, rgba(var(--primary), 0.15) 0%, rgba(var(--purple), 0.15) 100%);
    transform: scale(1.05);
  }
  
  /* Efectos de elevación */
  .elevation-effect {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(var(--primary), 0.1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  
  .feature-card:hover .elevation-effect {
    opacity: 1;
  }
  
  .glow-effect {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(var(--primary), 0.1) 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.5s ease;
    pointer-events: none;
  }
  
  .feature-card:hover .glow-effect {
    transform: translate(-50%, -50%) scale(1.5);
  }
  
  /* Animación de entrada */
  .fade-in {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
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
    .feature-card {
      padding: var(--space);
      border-radius: 20px;
    }
    
    .feature-icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
    }
    
    .feature-card:hover {
      transform: translateY(-8px) scale(1.02);
    }
  }
</style>
