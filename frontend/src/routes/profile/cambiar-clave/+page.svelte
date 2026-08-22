<script lang="ts">
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import Section from '$lib/components/Section.svelte';
  import PasswordField from '$lib/components/ui/PasswordField.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';
  import { Lock } from '@lucide/svelte';
  import { toasts } from '$lib/stores/toast';

  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';

  let saving = false;
  let currentPasswordError = '';
  let newPasswordError = '';
  let confirmPasswordError = '';

  function handleChangePassword() {
    currentPasswordError = '';
    newPasswordError = '';
    confirmPasswordError = '';

    if (!currentPassword) {
      currentPasswordError = 'Debe ingresar su contraseña actual';
      return;
    }

    if (!newPassword) {
      newPasswordError = 'Debe ingresar una nueva contraseña';
      return;
    }

    if (newPassword.length < 8) {
      newPasswordError = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    if (newPassword !== confirmPassword) {
      confirmPasswordError = 'Las contraseñas no coinciden';
      return;
    }

    saving = true;

    setTimeout(() => {
      if (currentPassword === '12345678') {
        toasts.show('Contraseña actualizada correctamente', 'success');
        currentPassword = '';
        newPassword = '';
        confirmPassword = '';
      } else {
        toasts.show('La contraseña actual es incorrecta', 'error');
      }
      saving = false;
    }, 1500);
  }
</script>

<PageLayout title="Cambiar contraseña">

  <div class="password-icon-container">
    <div class="password-icon">
      <Lock size={32} />
    </div>
  </div>

  <div class="form-card">
    <div class="form-fields">
      <div class="form-field">
        <PasswordField label="Contraseña actual" bind:value={currentPassword} error={currentPasswordError} />
      </div>
      <div class="form-field">
        <PasswordField label="Nueva contraseña" bind:value={newPassword} error={newPasswordError} placeholder="Nueva contraseña" />
      </div>
      <div class="form-field">
        <PasswordField label="Confirmar contraseña" bind:value={confirmPassword} error={confirmPasswordError} placeholder="Confirmar contraseña" />
      </div>
    </div>
  </div>

  <Section>
    <div class="security-tips">
      <h3>Consejos de seguridad</h3>
      <ul>
        <li>Utiliza una combinación de letras, números y símbolos</li>
        <li>No uses la misma contraseña que en otros sitios</li>
        <li>Evita información personal fácil de adivinar</li>
      </ul>
    </div>
  </Section>

  <PillButton label="Guardar cambios" onClick={handleChangePassword} loading={saving} fullWidth />
</PageLayout>

<style>
  .password-icon-container {
    display: flex;
    justify-content: center;
    margin: var(--space-4) 0;
  }

  .password-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.2);
  }

  .form-card {
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .form-fields {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .security-tips {
    background: rgba(var(--surface-rgb), 1);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .security-tips h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 var(--space-2) 0;
    color: rgba(var(--text-primary-rgb), 1);
  }

  .security-tips ul {
    margin: 0;
    padding-left: var(--space-6);
  }

  .security-tips li {
    font-size: 0.9rem;
    color: rgba(var(--text-secondary-rgb), 1);
    margin-bottom: 4px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
