/**
 * Script principal de pruebas
 * Ejecuta todas las pruebas en el orden correcto
 * Solo incluye pruebas para rutas que realmente existen en el sistema
 */

// Importar todas las suites de pruebas disponibles
import "./health.test.js";
import "./auth.test.js";
import "./qr/generation.test.js";
import "./payment/notification.test.js";

console.log("🧪 Todas las suites de pruebas importadas correctamente");
console.log("📋 Rutas cubiertas: health, auth, qr, payment");
