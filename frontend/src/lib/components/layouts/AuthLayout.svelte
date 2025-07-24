<script lang="ts">
    import { page } from '$app/state';
  import { APP_CONFIG } from '$lib/config';
  import { fly } from 'svelte/transition';
    import MainContent from './Components/MainContent.svelte';

</script>

{#key page.url.pathname}
<div class="auth-layout">
    <MainContent>
        <div class="auth-container">
            <div class="logo" in:fly={{ y: 32, duration: 500, delay: 80 }}>
            <div class="logo-icon">
                <img src="/favicon.png" alt="Logo" width="42" />
                <div class="logo-glow"></div>
            </div>
            <slot name="subtitle" />
            </div>
            <div class="auth-body" in:fly={{ y: 24, duration: 400, delay: 300 }}>
            <slot />
            </div>
            <div class="auth-footer" in:fly={{ y: 12, duration: 400, delay: 600 }}>
            <p>&copy; {APP_CONFIG.copyrightYear} {APP_CONFIG.appName}</p>
            </div>
        </div>
    </MainContent>
  <div class="bg-shape shape-1"></div>
  <div class="bg-shape shape-2"></div>
  <div class="bg-shape shape-3"></div>
</div>
{/key}

<style>
  .auth-layout {
    min-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--background);
    position: relative;
    overflow: hidden;
  }
  .auth-container {
    width: 100%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
  }
  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-xl);
  }
  .logo-icon {
    position: relative;
    margin-bottom: var(--spacing-md);
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-full);
    background: var(--surface);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }
  .logo-icon img {
    width: 36px;
    height: 36px;
    position: relative;
    z-index: 2;
  }
  .logo-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(58, 102, 255, 0.15) 0%, rgba(58, 102, 255, 0) 70%);
    z-index: 1;
    animation: pulse 4s infinite;
  }
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
  }
  .auth-body {
    width: 100%;
    margin-bottom: var(--spacing-lg);
  }
  .auth-footer {
    margin-top: auto;
    text-align: center;
  }
  .auth-footer p {
    color: var(--text-secondary);
    font-size: 0.75rem;
    opacity: 0.8;
  }
  .bg-shape {
    position: absolute;
    opacity: 0.03;
    background: var(--primary-color);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .shape-1 {
    width: 500px;
    height: 500px;
    border-radius: 40%;
    top: -250px;
    right: -100px;
    transform: rotate(30deg);
  }
  .shape-2 {
    width: 600px;
    height: 600px;
    border-radius: 35%;
    bottom: -300px;
    left: -200px;
    transform: rotate(20deg);
  }
  .shape-3 {
    width: 300px;
    height: 300px;
    border-radius: 30%;
    top: 40%;
    right: -100px;
    transform: rotate(15deg);
  }
</style> 