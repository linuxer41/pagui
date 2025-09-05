<script lang="ts">
  export let searchResult: any = null;
</script>

<div class="debug-message">
  <h3>Respuesta inconsistente del servidor</h3>
  <p>El servidor indica que se encontraron deudas pero no envió ninguna:</p>
  <p class="important-warning">Mensaje del servidor: {searchResult.mensaje || 'No hay información adicional'}</p>
  <pre>{JSON.stringify(searchResult, null, 2)}</pre>
  <p>Por favor informe este problema al equipo técnico junto con el número de abonado utilizado.</p>
</div>

<style>
  .debug-message {
    background-color: rgba(0, 0, 0, 0.05);
    border: 1px dashed rgba(var(--warning), 0.5);
    border-radius: var(--radius);
    padding: 1rem;
    margin: 1rem 0;
    font-size: 0.8rem;
    overflow: auto;
  }
   
  .debug-message h3 {
    color: rgba(var(--warning), 0.8);
    margin: 0 0 0.5rem 0;
  }
   
  .debug-message pre {
    background: rgba(0, 0, 0, 0.03);
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    overflow: auto;
    max-height: 200px;
    white-space: pre-wrap;
    font-family: monospace;
  }
   
  .important-warning {
    background-color: rgba(var(--error), 0.1);
    color: rgb(var(--error));
    padding: 0.5rem;
    border-left: 3px solid rgb(var(--error));
    font-weight: 600;
    margin: 0.5rem 0;
  }
</style>
