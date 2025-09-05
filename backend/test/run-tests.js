#!/usr/bin/env bun

/**
 * Ejecutor principal de pruebas
 * Ejecuta todas las pruebas del sistema
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Iniciando ejecución de pruebas...\n");

// Lista de archivos de prueba a ejecutar
const testFiles = [
  "connection.test.js",
  "health.test.js", 
  "auth.test.js",
  "accounts.test.js",
  "index.test.js"
];

// Función para ejecutar un archivo de prueba
async function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`📋 Ejecutando: ${testFile}`);
    
    const testPath = join(__dirname, testFile);
    const child = spawn("bun", ["test", testPath], {
      stdio: "inherit",
      cwd: __dirname
    });
    
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} completado exitosamente\n`);
        resolve();
      } else {
        console.log(`❌ ${testFile} falló con código ${code}\n`);
        reject(new Error(`Test ${testFile} failed with code ${code}`));
      }
    });
    
    child.on("error", (error) => {
      console.error(`💥 Error ejecutando ${testFile}:`, error);
      reject(error);
    });
  });
}

// Función principal para ejecutar todas las pruebas
async function runAllTests() {
  const results = [];
  
  for (const testFile of testFiles) {
    try {
      await runTestFile(testFile);
      results.push({ file: testFile, status: "PASS" });
    } catch (error) {
      results.push({ file: testFile, status: "FAIL", error: error.message });
    }
  }
  
  // Mostrar resumen
  console.log("📊 RESUMEN DE PRUEBAS:");
  console.log("=".repeat(50));
  
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  
  results.forEach(result => {
    const status = result.status === "PASS" ? "✅" : "❌";
    console.log(`${status} ${result.file}`);
    if (result.status === "FAIL") {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log("=".repeat(50));
  console.log(`Total: ${results.length} | ✅ Pasadas: ${passed} | ❌ Fallidas: ${failed}`);
  
  if (failed > 0) {
    console.log("\n❌ Algunas pruebas fallaron. Revisa los errores arriba.");
    process.exit(1);
  } else {
    console.log("\n🎉 ¡Todas las pruebas pasaron exitosamente!");
    process.exit(0);
  }
}

// Ejecutar todas las pruebas
runAllTests().catch(error => {
  console.error("💥 Error fatal ejecutando pruebas:", error);
  process.exit(1);
});
