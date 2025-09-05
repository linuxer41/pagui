<script lang="ts">
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { FileText, Shield, Users, CreditCard, Smartphone } from '@lucide/svelte';
</script>

<svelte:head>
  <title>Términos de Servicio | Pagui</title>
</svelte:head>

<RouteLayout title="Términos de Servicio">
<div class="terms-page">
  <div class="page-header">
    <div class="header-icon">
      <FileText size={32} />
    </div>
    <h1>Términos de Servicio</h1>
    <p class="last-updated">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
  </div>

  <div class="terms-content">
    <section class="terms-section">
      <h2><Shield size={20} /> Aceptación de Términos</h2>
      <p>Al acceder y utilizar la aplicación Pagui, aceptas estar sujeto a estos términos de servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro servicio.</p>
    </section>

    <section class="terms-section">
      <h2><CreditCard size={20} /> Descripción del Servicio</h2>
      <p>Pagui es una plataforma de pagos digitales que permite:</p>
      <ul>
        <li>Generar códigos QR para cobros</li>
        <li>Gestionar transacciones y pagos</li>
        <li>Integrar con sistemas externos mediante API</li>
        <li>Acceder a historial de transacciones</li>
      </ul>
    </section>

    <section class="terms-section">
      <h2><Users size={20} /> Cuenta de Usuario</h2>
      <p>Para usar Pagui, debes:</p>
      <ul>
        <li>Tener al menos 18 años de edad</li>
        <li>Proporcionar información veraz y actualizada</li>
        <li>Mantener la confidencialidad de tus credenciales</li>
        <li>Notificar inmediatamente cualquier uso no autorizado</li>
      </ul>
    </section>

    <section class="terms-section">
      <h2><Smartphone size={20} /> Uso Aceptable</h2>
      <p>Te comprometes a:</p>
      <ul>
        <li>Usar el servicio solo para fines legales</li>
        <li>No interferir con la operación del sistema</li>
        <li>No intentar acceder a cuentas de otros usuarios</li>
        <li>Respetar los derechos de propiedad intelectual</li>
      </ul>
    </section>

    <section class="terms-section">
      <h2><Shield size={20} /> Limitaciones de Responsabilidad</h2>
      <p>Pagui no será responsable por:</p>
      <ul>
        <li>Pérdidas financieras derivadas del uso del servicio</li>
        <li>Interrupciones temporales del servicio</li>
        <li>Daños indirectos o consecuenciales</li>
        <li>Acciones de terceros o proveedores de servicios</li>
      </ul>
    </section>

    <section class="terms-section">
      <h2><FileText size={20} /> Modificaciones</h2>
      <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la aplicación o por correo electrónico.</p>
    </section>

    <section class="terms-section">
      <h2><Shield size={20} /> Contacto</h2>
      <p>Si tienes preguntas sobre estos términos, contáctanos en:</p>
      <div class="contact-info">
        <p><strong>Email:</strong> legal@pagui.com</p>
        <p><strong>Soporte:</strong> soporte@pagui.com</p>
      </div>
    </section>
  </div>
</div>
</RouteLayout>

<style>
  .terms-page {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .page-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
  }

  .header-icon {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
  }

  .page-header h1 {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
  }

  .last-updated {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .terms-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .terms-section h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
  }

  .terms-section p {
    margin-bottom: var(--spacing-md);
    line-height: 1.6;
    color: var(--text-primary);
  }

  .terms-section ul {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
  }

  .terms-section li {
    margin-bottom: var(--spacing-xs);
    line-height: 1.5;
    color: var(--text-primary);
  }

  .contact-info {
    background: var(--surface);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border-color);
  }

  .contact-info p {
    margin-bottom: var(--spacing-xs);
  }

  .contact-info p:last-child {
    margin-bottom: 0;
  }
</style>
