# 📋 Ejemplo de Notificación de Pago Procesada

## 🔄 Notificación Recibida

```json
{
  "payment": {
    "qrId": "25090801016297045835",
    "transactionId": "746648401",
    "paymentDate": "2025-09-08T04:00:00Z",
    "paymentTime": "17:12:47",
    "currency": "BOB",
    "amount": 0.1,
    "senderBankCode": "1014      ",
    "senderName": "OCHOA GONZALES FRANCISCO",
    "senderDocumentId": "0",
    "senderAccount": "**********8286"
  }
}
```

## 💾 Registro en `account_movements`

```sql
INSERT INTO account_movements (
  account_id, movement_type, amount, balance_before, balance_after,
  description, qr_id, transaction_id, payment_date, payment_time, currency,
  sender_name, sender_document_id, sender_account, sender_bank_code,
  reference_id, reference_type
) VALUES (
  1,                    -- account_id (ID de la cuenta del usuario)
  'qr_payment',         -- movement_type
  0.1,                  -- amount
  10000.00,             -- balance_before
  10000.10,             -- balance_after
  'Pago QR recibido',   -- description
  '25090801016297045835', -- qr_id
  '746648401',          -- transaction_id (UNIQUE - previene duplicados)
  '2025-09-08 04:00:00+00', -- payment_date
  '17:12:47',           -- payment_time
  'BOB',                -- currency
  'OCHOA GONZALES FRANCISCO', -- sender_name
  '0',                  -- sender_document_id
  '**********8286',     -- sender_account
  '1014      ',         -- sender_bank_code
  '746648401',          -- reference_id
  'qr_payment'          -- reference_type
);
```

## 🛡️ Validación de Duplicados

El sistema ahora valida automáticamente si ya existe un movimiento con el mismo `transaction_id`:

```typescript
// Verificar si ya existe un movimiento con el mismo transaction_id
if (data.transactionId) {
  const existingMovement = await query(`
    SELECT id FROM account_movements 
    WHERE transaction_id = $1 AND deleted_at IS NULL
  `, [data.transactionId]);

  if (existingMovement.rowCount && existingMovement.rowCount > 0) {
    console.log(`⚠️ Movimiento duplicado ignorado - transaction_id: ${data.transactionId}`);
    return; // Ignorar el movimiento duplicado
  }
}
```

## 📊 Respuesta del Endpoint `/accounts/:id/stats`

```json
{
  "success": true,
  "data": {
    "account": {
      "id": 1,
      "walletNumber": "100013101",
      "accountType": "business",
      "currency": "BOB",
      "balance": 10000.10,
      "availableBalance": 10000.10,
      "status": "active"
    },
    "today": {
      "amount": 0.1,
      "growthPercentage": 0.0
    },
    "thisWeek": {
      "amount": 0.1,
      "growthPercentage": 0.0
    },
    "thisMonth": {
      "amount": 0.1,
      "growthPercentage": 0.0
    },
    "recentMovements": [
      {
        "id": 1,
        "accountId": 1,
        "movementType": "qr_payment",
        "amount": 0.1,
        "description": "Pago QR recibido",
        "reference": "746648401",
        "createdAt": "2025-01-08T17:12:47.000Z",
        "qrId": "25090801016297045835",
        "transactionId": "746648401",
        "paymentDate": "2025-09-08T04:00:00.000Z",
        "paymentTime": "17:12:47",
        "currency": "BOB",
        "senderName": "OCHOA GONZALES FRANCISCO",
        "senderDocumentId": "0",
        "senderAccount": "**********8286",
        "senderBankCode": "1014      "
      }
    ]
  },
  "message": "Estadísticas obtenidas exitosamente"
}
```

## ✅ Beneficios Implementados

1. **🛡️ Prevención de Duplicados**: El `transaction_id` único previene que se registren pagos duplicados
2. **📋 Información Completa**: Todos los campos de la notificación se almacenan en la base de datos
3. **💰 Balance Actualizado**: El balance de la cuenta se actualiza automáticamente
4. **📊 Estadísticas Detalladas**: Los movimientos incluyen toda la información del remitente
5. **🔄 Sincronización**: Compatible con el sistema de colas de sincronización de pagos

## 🚀 Uso en la Aplicación

El sistema ahora puede:
- Procesar notificaciones de pago sin duplicados
- Mostrar información detallada del remitente en el historial
- Mantener balances precisos
- Proporcionar estadísticas completas de recaudaciones

