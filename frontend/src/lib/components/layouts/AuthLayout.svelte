<script lang="ts">
  let { title, subtitle, children } = $props()
</script>

<div class="auth-screen">
  <div class="auth-bg">
    <div class="auth-circle auth-circle-1"></div>
    <div class="auth-circle auth-circle-2"></div>
    <div class="auth-circle auth-circle-3"></div>
  </div>
  <div class="auth-container">
    <div class="auth-head animate-slide-up">
      <div class="auth-logo">
        <span class="auth-logo-text">P</span>
      </div>
      {#if title}
        <h1 class="auth-title">{title}</h1>
      {/if}
      {#if subtitle}
        <p class="auth-subtitle">{subtitle}</p>
      {/if}
    </div>
    <div class="auth-body animate-fade-in" style="animation-delay: 150ms">
      <div class="auth-card">
        {@render children()}
      </div>
    </div>
  </div>
</div>

<style>
  .auth-screen {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
    padding: var(--space-6);
  }
  .auth-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .auth-circle {
    position: absolute;
    border-radius: 50%;
  }
  .auth-circle-1 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(79,70,229,0.12), transparent 70%);
    top: -120px;
    right: -100px;
  }
  .auth-circle-2 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%);
    bottom: -80px;
    left: -80px;
  }
  .auth-circle-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(79,70,229,0.06), transparent 70%);
    bottom: 40%;
    right: -60px;
  }
  .auth-container {
    width: 100%;
    max-width: 380px;
    position: relative;
    z-index: 1;
  }
  .auth-head {
    text-align: center;
    margin-bottom: var(--space-8);
  }
  .auth-logo {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-2xl);
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-4);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
  }
  .auth-logo-text {
    font-size: 28px;
    font-weight: 800;
    color: white;
    letter-spacing: var(--tracking-tight);
  }
  .auth-title {
    font-size: var(--text-2xl);
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: var(--tracking-tight);
    margin-bottom: var(--space-2);
  }
  .auth-subtitle {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);
  }
  .auth-body { animation-delay: 150ms; }
  .auth-card {
    background: var(--surface);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
  }
</style>
