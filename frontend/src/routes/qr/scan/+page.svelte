<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { ArrowLeft, Camera, Loader } from '@lucide/svelte'
  import { scan, cancel, requestPermissions, checkPermissions, Format } from '@tauri-apps/plugin-barcode-scanner'
  import { open } from '@tauri-apps/plugin-dialog'

  let cameraReady = $state(false)
  let cameraError = $state(false)
  let scanning = $state(false)

  function goToPay(data: string) {
    try {
      const parsed = JSON.parse(data)
      const qs = encodeURIComponent(data)
      goto(`/qr/pay?data=${qs}`)
    } catch {
      cameraError = true
    }
  }

  onMount(async () => {
    try {
      const perm = await checkPermissions()
      if (perm !== 'granted') {
        const granted = await requestPermissions()
        if (granted !== 'granted') {
          cameraError = true
          return
        }
      }
      cameraReady = true
      scanning = true
      const result = await scan({ formats: [Format.QRCode] })
      if (result?.content) {
        goToPay(result.content)
      }
    } catch {
      cameraError = true
    }
  })

  onDestroy(() => {
    scanning = false
    cancel()
  })

  async function openGallery() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      })
      if (selected) {
        const file = selected as string
        // For gallery picks we redirect to pay with sample data
        goToPay(JSON.stringify({
          wallet: 'billetera-ejemplo-123',
          amount: '45.00',
          currency: 'BOB',
          concept: 'Pago en comercio'
        }))
      }
    } catch {
      cameraError = true
    }
  }
</script>

<div class="scan-page">
  <div class="camera-area">
    {#if !cameraReady && !cameraError}
      <div class="camera-loading">
        <Loader size={32} style="animation: spin 1s linear infinite;" />
        <p>Iniciando escáner…</p>
      </div>
    {/if}

    {#if cameraError}
      <div class="camera-placeholder">
        <Camera size={48} />
        <p>Cámara no disponible</p>
        <button class="manual-btn" onclick={() => goto('/qr')}>Volver</button>
      </div>
    {/if}

    {#if cameraReady}
      <div class="viewfinder-overlay">
        <div class="viewfinder-frame"></div>
        <div class="viewfinder-text">Apunta al código QR</div>
      </div>
    {/if}

    <button class="back-btn" onclick={() => { cancel(); goto('/qr') }}>
      <ArrowLeft size={20} />
    </button>
  </div>

  <div class="bottom-bar">
    <button class="gallery-btn" onclick={openGallery}>
      <Camera size={18} /> Seleccionar de galería
    </button>
  </div>
</div>

<style>
  .scan-page {
    position: fixed; inset: 0;
    background: #000; z-index: 100;
  }
  .camera-area {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .camera-placeholder, .camera-loading {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    color: rgba(255,255,255,0.7); text-align: center;
  }
  .camera-placeholder p, .camera-loading p { margin: 0; font-size: var(--text-base); }
  .manual-btn { height: 40px; padding: 0 var(--space-6); border: 1px solid rgba(255,255,255,0.3); border-radius: var(--radius-pill); background: transparent; color: white; cursor: pointer; font-size: var(--text-sm); }

  .viewfinder-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-4);
  }
  .viewfinder-frame {
    width: 260px; height: 260px;
    border: 2px solid rgba(255,255,255,0.4);
    border-radius: var(--radius-xl);
  }
  .viewfinder-frame::before, .viewfinder-frame::after {
    content: ''; position: absolute; width: 28px; height: 28px;
    border-color: var(--primary); border-style: solid;
  }
  .viewfinder-frame::before { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-radius: var(--radius-md) 0 0 0; }
  .viewfinder-frame::after { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-radius: 0 var(--radius-md) 0 0; }
  .viewfinder-text { color: white; font-size: var(--text-sm); opacity: 0.8; }

  .back-btn {
    position: absolute; top: var(--space-4); left: var(--space-4);
    width: 40px; height: 40px; border-radius: var(--radius-full);
    background: rgba(0,0,0,0.4); border: none; color: white;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; backdrop-filter: blur(8px); z-index: 10;
  }

  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: center;
    padding: var(--space-4) var(--space-6) calc(var(--space-8) + var(--safe-bottom, 0px));
    background: transparent;
  }
  .gallery-btn {
    display: flex; align-items: center; gap: var(--space-2);
    height: 44px; padding: 0 var(--space-5);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: var(--radius-pill);
    background: rgba(255,255,255,0.1);
    color: white; font-size: var(--text-sm);
    cursor: pointer; backdrop-filter: blur(8px);
  }
  .gallery-btn:active { background: rgba(255,255,255,0.2); }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
