<script lang="ts">
  import RouteLayout from '$lib/components/layouts/RouteLayout.svelte';
  import { Shield, Eye, Lock, Database, Globe, Mail, Phone, Calendar } from '@lucide/svelte';
</script>

<svelte:head>
  <title>Política de Privacidad | Pagui</title>
</svelte:head>

<RouteLayout title="Política de Privacidad">
<div class="privacy-page">
  <div class="page-header">
    <div class="header-icon">
      <Shield size={32} />
    </div>
    <h1>Política de Privacidad</h1>
    <p class="last-updated">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
  </div>

  <div class="privacy-content">
    <section class="privacy-section">
      <h2><Eye size={20} /> Información que Recopilamos</h2>
      <p>Recopilamos la siguiente información para proporcionar y mejorar nuestros servicios:</p>
      <ul>
        <li><strong>Información de cuenta:</strong> Nombre, email, información de contacto</li>
        <li><strong>Información de transacciones:</strong> Montos, fechas, descripciones de pagos</li>
        <li><strong>Información de uso:</strong> Cómo utilizas la aplicación y sus funciones</li>
        <li><strong>Información técnica:</strong> Dispositivo, navegador, dirección IP</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Database size={20} /> Cómo Utilizamos tu Información</h2>
      <p>Utilizamos tu información para:</p>
      <ul>
        <li>Procesar transacciones y pagos</li>
        <li>Generar códigos QR y gestionar cobros</li>
        <li>Proporcionar soporte técnico y atención al cliente</li>
        <li>Mejorar nuestros servicios y funcionalidades</li>
        <li>Cumplir con obligaciones legales y regulatorias</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Lock size={20} /> Protección de Datos</h2>
      <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:</p>
      <ul>
        <li>Encriptación de datos en tránsito y en reposo</li>
        <li>Acceso restringido a información personal</li>
        <li>Monitoreo continuo de seguridad</li>
        <li>Auditorías regulares de seguridad</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Globe size={20} /> Compartir Información</h2>
      <p>No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto:</p>
      <ul>
        <li>Con tu consentimiento explícito</li>
        <li>Para procesar transacciones (bancos, proveedores de pago)</li>
        <li>Para cumplir con obligaciones legales</li>
        <li>Para proteger nuestros derechos y seguridad</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Calendar size={20} /> Retención de Datos</h2>
      <p>Conservamos tu información personal mientras:</p>
      <ul>
        <li>Tengas una cuenta activa con nosotros</li>
        <li>Sea necesario para proporcionar servicios</li>
        <li>Se requiera para cumplir obligaciones legales</li>
        <li>Existan intereses legítimos de negocio</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Mail size={20} /> Tus Derechos</h2>
      <p>Tienes derecho a:</p>
      <ul>
        <li>Acceder a tu información personal</li>
        <li>Corregir información inexacta</li>
        <li>Solicitar la eliminación de tus datos</li>
        <li>Oponerte al procesamiento de datos</li>
        <li>Portabilidad de tus datos</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Phone size={20} /> Cookies y Tecnologías Similares</h2>
      <p>Utilizamos cookies y tecnologías similares para:</p>
      <ul>
        <li>Mantener tu sesión activa</li>
        <li>Recordar tus preferencias</li>
        <li>Analizar el uso de la aplicación</li>
        <li>Mejorar la funcionalidad</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Shield size={20} /> Cambios en esta Política</h2>
      <p>Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos sobre cambios significativos a través de:</p>
      <ul>
        <li>Notificaciones en la aplicación</li>
        <li>Correos electrónicos</li>
        <li>Actualizaciones en nuestro sitio web</li>
      </ul>
    </section>

    <section class="privacy-section">
      <h2><Mail size={20} /> Contacto</h2>
      <p>Si tienes preguntas sobre esta política de privacidad o quieres ejercer tus derechos, contáctanos:</p>
      <div class="contact-info">
        <p><strong>Oficial de Privacidad:</strong> privacy@pagui.com</p>
        <p><strong>Soporte:</strong> soporte@pagui.com</p>
        <p><strong>Dirección:</strong> Av. Principal 123, Ciudad, País</p>
      </div>
    </section>
  </div>
</div>
</RouteLayout>

<style>
  .privacy-page {
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

  .privacy-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .privacy-section h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
  }

  .privacy-section p {
    margin-bottom: var(--spacing-md);
    line-height: 1.6;
    color: var(--text-primary);
  }

  .privacy-section ul {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
  }

  .privacy-section li {
    margin-bottom: var(--spacing-xs);
    line-height: 1.5;
    color: var(--text-primary);
  }

  .privacy-section strong {
    color: var(--text-primary);
    font-weight: 600;
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
