<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { 
    ArrowLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Edit3,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    Building2
  } from '@lucide/svelte';

  // Estado de la información del usuario
  let userInfo = {
    fullName: 'Juan Carlos Pérez',
    email: 'juan.perez@email.com',
    phone: '+591 77712345',
    address: 'Av. Principal 123, Zona Sur',
    city: 'La Paz',
    country: 'Bolivia',
    birthDate: '1990-05-15',
    accountType: 'business', // 'personal' o 'business'
    // Información empresarial (solo si es cuenta business)
    business: {
      companyName: 'Tech Solutions SRL',
      position: 'Desarrollador Senior',
      businessType: 'Servicios de Tecnología',
      taxId: '123456789',
      website: 'https://techsolutions.com'
    }
  };

  // Estado para el modo de edición
  let isEditing = false;
  let editingInfo = { ...userInfo };
  
  // Función para cambiar tipo de cuenta
  function toggleAccountType() {
    if (userInfo.accountType === 'personal') {
      userInfo.accountType = 'business';
    } else {
      userInfo.accountType = 'personal';
    }
    userInfo = { ...userInfo };
  }

  // Estado para el acordeón
  let expandedSections = {
    personal: true,
    contact: false,
    professional: false
  };

  // Función para alternar sección del acordeón
  function toggleSection(section: string) {
    expandedSections[section] = !expandedSections[section];
    expandedSections = { ...expandedSections };
  }

  // Función para iniciar edición
  function startEditing() {
    editingInfo = { ...userInfo };
    isEditing = true;
  }

  // Función para cancelar edición
  function cancelEditing() {
    editingInfo = { ...userInfo };
    isEditing = false;
  }

  // Función para guardar cambios
  function saveChanges() {
    userInfo = { ...editingInfo };
    isEditing = false;
    // Aquí puedes implementar la lógica para guardar en la API
  }



  // Formatear fecha
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
</script>

<svelte:head>
  <title>Detalles de la Cuenta | Pagui</title>
</svelte:head>

<RouteLayout title="Detalles de la Cuenta">
<div class="account-details-page">

  <!-- Información de la cuenta -->
  <div class="account-info">
    <div class="info-header">
      <div class="user-avatar">
        <User size={32} />
      </div>
      <div class="user-summary">
        <h2>{userInfo.fullName}</h2>
        <p class="user-email">{userInfo.email}</p>
        <div class="account-type-selector">
          <span class="account-type-badge {userInfo.accountType}">
            {userInfo.accountType === 'business' ? '🏢 Empresarial' : '👤 Personal'}
          </span>
          <button class="toggle-account-type" on:click={toggleAccountType} title="Cambiar tipo de cuenta">
            <Edit3 size={16} />
          </button>
        </div>
      </div>
             {#if !isEditing}
         <button class="edit-button" on:click={startEditing}>
           <Edit3 size={16} />
           Editar
         </button>
       {:else}
         <div class="edit-actions">
           <button class="action-button cancel" on:click={cancelEditing}>
             <X size={16} />
             Cancelar
           </button>
           <button class="action-button save" on:click={saveChanges}>
             <Save size={16} />
             Guardar
           </button>
         </div>
       {/if}
    </div>
  </div>

  <!-- Acordeón de información -->
  <div class="accordion">
    <!-- Información Personal -->
    <div class="accordion-section">
      <button class="accordion-header" on:click={() => toggleSection('personal')}>
        <div class="header-content">
          <User size={20} />
          <span>Información Personal</span>
        </div>
        {#if expandedSections.personal}
          <ChevronUp size={20} />
        {:else}
          <ChevronDown size={20} />
        {/if}
      </button>
      
      {#if expandedSections.personal}
        <div class="accordion-content">
          <div class="info-grid">
            <div class="info-item">
              <label>Nombre completo</label>
              {#if isEditing}
                <input 
                  type="text" 
                  bind:value={editingInfo.fullName}
                  placeholder="Ingresa tu nombre completo"
                />
              {:else}
                <span class="info-value">{userInfo.fullName}</span>
              {/if}
            </div>
            
                         <div class="info-item">
               <label>Fecha de nacimiento</label>
               <span class="info-value non-editable">{formatDate(userInfo.birthDate)}</span>
             </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Información de Contacto -->
    <div class="accordion-section">
      <button class="accordion-header" on:click={() => toggleSection('contact')}>
        <div class="header-content">
          <Mail size={20} />
          <span>Información de Contacto</span>
        </div>
        {#if expandedSections.contact}
          <ChevronUp size={20} />
        {:else}
          <ChevronDown size={20} />
        {/if}
      </button>
      
      {#if expandedSections.contact}
        <div class="accordion-content">
          <div class="info-grid">
                         <div class="info-item">
               <label>Email</label>
               <span class="info-value non-editable">{userInfo.email}</span>
             </div>
            
            <div class="info-item">
              <label>Teléfono</label>
              {#if isEditing}
                <input 
                  type="tel" 
                  bind:value={editingInfo.phone}
                  placeholder="+591 77712345"
                />
              {:else}
                <span class="info-value">{userInfo.phone}</span>
              {/if}
            </div>
            
            <div class="info-item full-width">
              <label>Dirección</label>
              {#if isEditing}
                <input 
                  type="text" 
                  bind:value={editingInfo.address}
                  placeholder="Ingresa tu dirección completa"
                />
              {:else}
                <span class="info-value">{userInfo.address}</span>
              {/if}
            </div>
            
            
            
            <div class="info-item">
              <label>País</label>
              {#if isEditing}
                <input 
                  type="text" 
                  bind:value={editingInfo.country}
                  placeholder="País"
                />
              {:else}
                <span class="info-value">{userInfo.country}</span>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Información Empresarial (solo para cuentas business) -->
    {#if userInfo.accountType === 'business'}
      <div class="accordion-section">
        <button class="accordion-header" on:click={() => toggleSection('professional')}>
          <div class="header-content">
            <Building2 size={20} />
            <span>Información Empresarial</span>
          </div>
          {#if expandedSections.professional}
            <ChevronUp size={20} />
          {:else}
            <ChevronDown size={20} />
          {/if}
        </button>
        
        {#if expandedSections.professional}
          <div class="accordion-content">
            <div class="info-grid">
              <div class="info-item">
                <label>Nombre de la empresa</label>
                {#if isEditing}
                  <input 
                    type="text" 
                    bind:value={editingInfo.business.companyName}
                    placeholder="Nombre de la empresa"
                  />
                {:else}
                  <span class="info-value">{userInfo.business.companyName}</span>
                {/if}
              </div>
              
              <div class="info-item">
                <label>Cargo</label>
                {#if isEditing}
                  <input 
                    type="text" 
                    bind:value={editingInfo.business.position}
                    placeholder="Tu cargo o posición"
                  />
                {:else}
                  <span class="info-value">{userInfo.business.position}</span>
                {/if}
              </div>
              
              <div class="info-item">
                <label>Tipo de negocio</label>
                {#if isEditing}
                  <input 
                    type="text" 
                    bind:value={editingInfo.business.businessType}
                    placeholder="Tipo de negocio"
                  />
                {:else}
                  <span class="info-value">{userInfo.business.businessType}</span>
                {/if}
              </div>
              
              <div class="info-item">
                <label>NIT/RUC</label>
                {#if isEditing}
                  <input 
                    type="text" 
                    bind:value={editingInfo.business.taxId}
                    placeholder="Número de identificación tributaria"
                  />
                {:else}
                  <span class="info-value">{userInfo.business.taxId}</span>
                {/if}
              </div>
              
              <div class="info-item full-width">
                <label>Sitio web</label>
                {#if isEditing}
                  <input 
                    type="url" 
                    bind:value={editingInfo.business.website}
                    placeholder="https://tu-empresa.com"
                  />
                {:else}
                  <span class="info-value">
                    {#if userInfo.business.website}
                      <a href={userInfo.business.website} target="_blank" rel="noopener noreferrer">
                        {userInfo.business.website}
                      </a>
                    {:else}
                      No especificado
                    {/if}
                  </span>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}


  </div>
</div>
</RouteLayout>

<style>
  .account-details-page {
    max-width: 700px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
  }



  .account-info {
    background: var(--background);
    border: none;
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .user-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    flex-shrink: 0;
  }

  .user-summary {
    flex: 1;
  }

  .user-summary h2 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .user-email {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .account-type-selector {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .account-type-badge {
    padding: 4px 8px;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0.3px;
  }

  .account-type-badge.personal {
    background: var(--surface);
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
  }

  .account-type-badge.business {
    background: var(--surface);
    color: var(--accent-color);
    border: 1px solid var(--accent-color);
  }

  .toggle-account-type {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    transition: all 0.2s;
  }

  .toggle-account-type:hover {
    background: var(--surface-hover);
    color: var(--primary-color);
  }

  .edit-button {
    background: none;
    border: none;
    color: var(--primary-color);
    padding: 8px 16px;
    border-radius: var(--border-radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .edit-button:hover {
    background: var(--surface-hover);
    text-decoration: none;
  }

  .edit-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .action-button {
    padding: 8px 16px;
    border-radius: var(--border-radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
  }

  .action-button.cancel {
    background: var(--surface);
    color: var(--text-secondary);
  }

  .action-button.cancel:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .action-button.save {
    background: var(--primary-color);
    color: white;
  }

  .action-button.save:hover {
    background: var(--primary-dark);
  }

  .accordion {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .accordion-section {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    overflow: hidden;
    margin-bottom: var(--spacing-sm);
  }

  .accordion-header {
    width: 100%;
    background: none;
    border: none;
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: left;
  }

  .accordion-header:hover {
    background: var(--surface-hover);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    font-weight: 500;
    font-size: 1rem;
  }

  .accordion-content {
    padding: 0 var(--spacing-md) var(--spacing-md);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .info-item.full-width {
    grid-column: 1 / -1;
  }

  .info-item label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: none;
    letter-spacing: 0.2px;
  }

  .info-item input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.95rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .info-item input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(58, 102, 255, 0.1);
  }

  .info-item input::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  .info-value {
    color: var(--text-primary);
    font-size: 0.95rem;
    padding: var(--spacing-xs) 0;
  }

  .info-value a {
    color: var(--primary-color);
    text-decoration: none;
    transition: color 0.2s;
  }

  .info-value a:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }

  .info-value.non-editable {
    color: var(--text-secondary);
    font-style: italic;
    opacity: 0.8;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
    
    .info-header {
      flex-direction: column;
      text-align: center;
      gap: var(--spacing-md);
    }
    
    .edit-actions {
      width: 100%;
      justify-content: center;
    }
  }
</style>
