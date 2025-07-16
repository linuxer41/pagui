// baneco_qr.js
const fs = require("fs");

// ==========================
// CONFIGURACIÓN GLOBAL
// ==========================
const API_BASE = "https://apimktdesa.baneco.com.bo/ApiGateway";
const AES_KEY = "6F09E3167E1D40829207B01041A65B12"; // Proporcionada por el banco
const USERNAME = "1649710";
const PASSWORD = "1234";
const ACCOUNT_NUMBER = "1041070599"; // Número de cuenta real (plano)


// ==========================
// FUNCIONES DE UTILIDAD
// ==========================

async function encryptText(text, aesKey = AES_KEY) {
  const url = `${API_BASE}/api/authentication/encrypt?text=${encodeURIComponent(text)}&aesKey=${aesKey}`;
  const res = await fetch(url);
  return await res.json();
}

async function getToken(username = USERNAME, passwordPlain = PASSWORD) {
  const encryptedPassword = await encryptText(passwordPlain);
  console.log({ username, passwordPlain, encryptedPassword });
  const url = `${API_BASE}/api/authentication/authenticate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userName: username, password: encryptedPassword })
  });
//   console.log(res);
  const data = await res.json();
//   console.log(data);
  if (data.responseCode !== 0) throw new Error(data.message);
  return data.token;
}

async function generateQr(token, transactionId, amount, description = "Pago QR") {
  const encryptedAccount = await encryptText(ACCOUNT_NUMBER);
  const payload = {
    transactionId,
    accountCredit: encryptedAccount,
    currency: "BOB",
    amount,
    description,
    dueDate: "2025-12-31",
    singleUse: true,
    modifyAmount: false,
    branchCode: "E0001"
  };
  const res = await fetch(`${API_BASE}/api/qrsimple/generateQR`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message);
  return data;
}

async function cancelQr(token, qrId) {
  const res = await fetch(`${API_BASE}/api/qrsimple/cancelQR`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ qrId })
  });
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message);
  return data;
}

async function getQrStatus(token, qrId) {
  const res = await fetch(`${API_BASE}/api/qrsimple/v2/statusQR/${qrId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message);
  return data;
}

async function getPaidQrsByDate(token, dateStr) {
  // dateStr debe tener formato: yyyyMMdd
  const res = await fetch(`${API_BASE}/api/qrsimple/v2/paidQR/${dateStr}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const data = await res.json();
  if (data.responseCode !== 0) throw new Error(data.message);
  return data.paymentList;
}


// ==========================
// USO DE EJEMPLO
// ==========================
(async () => {
  try {
    const token = await getToken();
    console.log("Token obtenido correctamente.\n");

    const qr = await generateQr(token, "TXN" + Date.now(), 15.50, "Pago prueba QR");
    console.log("✅ QR generado:", qr.qrId);
    console.log("🖼️ Imagen Base64:", qr.qrImage.slice(0, 80) + "...");
    // guardar la imagen en un archivo
    fs.writeFileSync(qr.qrId + ".png", qr.qrImage, "base64");

    const status = await getQrStatus(token, qr.qrId);
    console.log("\n📦 Estado QR:", status.statusQrCode === 0 ? "Pendiente" : status.statusQrCode === 1 ? "Pagado" : "Anulado");

    // const cancel = await cancelQr(token, qr.qrId);
    // console.log("❌ QR anulado correctamente:", cancel.message);

    const pagos = await getPaidQrsByDate(token, "20250708");
    console.log("\n📋 Pagos encontrados:", pagos.length);
    pagos.forEach(p => console.log(` - ${p.senderName} pagó ${p.amount} ${p.currency}`));

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
