<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  import { Camera } from '@lucide/svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import Section from '$lib/components/Section.svelte';
  import PageLayout from '$lib/components/layouts/PageLayout.svelte';
  import PillButton from '$lib/components/ui/PillButton.svelte';

  let fullName = $auth.user?.fullName || '';
  let email = $auth.user?.email || '';
  let phone = '+591 77712345';
  let profileImage: File | null = null;
  let imagePreview = '';

  let saving = false;

  onMount(async () => {
    try {
      fullName = $auth.user?.fullName || '';
      email = $auth.user?.email || '';
    } catch (err) {
      console.error('Error cargando datos del perfil:', err);
    }
  });

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    profileImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      toasts.show('El nombre es obligatorio', 'error');
      return;
    }

    saving = true;

    try {
      const profileData = {
        fullName,
        phone,
        profileImage
      };

      const response = await api.updateProfile(profileData);

      if (response.success) {
        if (response.data) {
          auth.updateUser(response.data);
        } else {
          if ($auth.user) {
            const updatedUser = {
              ...$auth.user,
              fullName
            };
            auth.updateUser(updatedUser);
          }
        }

        toasts.show('Perfil actualizado correctamente', 'success');
      } else {
        toasts.show(response.message || 'Error al actualizar el perfil', 'error');
      }
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      toasts.show(err instanceof Error ? err.message : 'Error de conexión al actualizar el perfil', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<PageLayout title="Editar perfil">
  <Section>
    <div class="profile-avatar-section">
      <div class="avatar-container">
        {#if imagePreview}
          <img src={imagePreview} alt="Vista previa" class="avatar-preview" />
        {:else}
          <div class="avatar-placeholder">
            {fullName.charAt(0).toUpperCase()}
          </div>
        {/if}

        <label for="profile-image" class="avatar-upload-button">
          <Camera size={18} />
        </label>
        <input
          type="file"
          id="profile-image"
          accept="image/*"
          onchange={handleFileChange}
          class="hidden-input"
        />
      </div>
      <p class="avatar-help-text">Toca para cambiar tu foto</p>
    </div>

    <TextField label="Nombre completo" bind:value={fullName} />
    <TextField label="Teléfono" bind:value={phone} />
    <TextField label="Email" value={email} disabled />
    <p>El email no se puede modificar</p>

    <PillButton label="Guardar cambios" onClick={handleSaveProfile} loading={saving} fullWidth />
  </Section>
</PageLayout>

<style>
  .profile-avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: var(--space-6) 0;
  }

  .avatar-container {
    position: relative;
    margin-bottom: var(--space-2);
  }

  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), #CC6A00);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(58, 102, 255, 0.2);
  }

  .avatar-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  .avatar-upload-button {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }

  .avatar-upload-button:hover {
    transform: scale(1.1);
  }

  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .avatar-help-text {
    font-size: 0.85rem;
    color: rgba(var(--text-secondary-rgb), 1);
    margin-top: var(--space-1);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
