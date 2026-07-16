<script lang="ts">
  import { FileText, Shield, Users, CreditCard, Smartphone } from '@lucide/svelte';
import PageLayout from '$lib/components/layouts/PageLayout.svelte';
</script>

<PageLayout title="Términos y Condiciones">
  <p class="last-updated">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

  <div class="content">
    <section><h2><Shield size={20} /> Aceptación de Términos</h2><p>Al acceder y utilizar la aplicación Pagui, aceptas estar sujeto a estos términos de servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro servicio.</p></section>
    <section><h2><CreditCard size={20} /> Descripción del Servicio</h2><p>Pagui es una plataforma de pagos digitales que permite:</p><ul><li>Generar códigos QR para cobros</li><li>Gestionar transacciones y pagos</li><li>Integrar con sistemas externos mediante API</li><li>Acceder a historial de transacciones</li></ul></section>
    <section><h2><Users size={20} /> Cuenta de Usuario</h2><p>Para usar Pagui, debes:</p><ul><li>Tener al menos 18 años de edad</li><li>Proporcionar información veraz y actualizada</li><li>Mantener la confidencialidad de tus credenciales</li><li>Notificar inmediatamente cualquier uso no autorizado</li></ul></section>
    <section><h2><Smartphone size={20} /> Uso Aceptable</h2><p>Te comprometes a:</p><ul><li>Usar el servicio solo para fines legales</li><li>No interferir con la operación del sistema</li><li>No intentar acceder a cuentas de otros usuarios</li><li>Respetar los derechos de propiedad intelectual</li></ul></section>
    <section><h2><Shield size={20} /> Limitaciones de Responsabilidad</h2><p>Pagui no será responsable por:</p><ul><li>Pérdidas financieras derivadas del uso del servicio</li><li>Interrupciones temporales del servicio</li><li>Daños indirectos o consecuenciales</li><li>Acciones de terceros o proveedores de servicios</li></ul></section>
    <section><h2><FileText size={20} /> Modificaciones</h2><p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la aplicación o por correo electrónico.</p></section>
    <section><h2><Shield size={20} /> Contacto</h2><p>Si tienes preguntas sobre estos términos, contáctanos en:</p><div class="contact-info"><p><strong>Email:</strong> legal@pagui.com</p><p><strong>Soporte:</strong> soporte@pagui.com</p></div></section>
  </div>

</PageLayout>

<style>
  .last-updated { color: rgba(var(--text-secondary-rgb), 0.8); font-size: var(--text-sm); }
  .content { display: flex; flex-direction: column; gap: var(--space-5); }
  section h2 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-base); font-weight: 600; margin: 0 0 var(--space-3); color: var(--primary); }
  section p { margin: 0 0 var(--space-3); line-height: 1.6; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); }
  section ul { margin: 0; padding-left: var(--space-5); }
  section li { margin-bottom: var(--space-1); line-height: 1.5; color: rgba(var(--text-primary-rgb), 1); font-size: var(--text-sm); }
  .contact-info { background: rgba(var(--surface-rgb), 1); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid rgba(var(--border-rgb), 0.3); }
  .contact-info p { margin-bottom: var(--space-1); font-size: var(--text-sm); }
  .contact-info p:last-child { margin-bottom: 0; }
</style>
