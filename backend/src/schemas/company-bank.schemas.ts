import { t } from 'elysia';

/**
 * Esquema para validar los datos de registro de un banco para una compañía
 */
export const CompanyBankSchema = t.Object({
  // ID del banco a registrar
  bankId: t.Number({
    description: 'ID del banco',
    minimum: 1
  }),
  
  // Número de cuenta en el banco
  accountNumber: t.String({
    description: 'Número de cuenta en el banco',
    minLength: 3,
    maxLength: 50
  }),
  
  // Tipo de cuenta (opcional, por defecto 1)
  accountType: t.Optional(
    t.Number({
      description: 'Tipo de cuenta',
      minimum: 1,
      maximum: 5,
      default: 1
    })
  ),
  
  // Nombre de la cuenta (opcional)
  accountName: t.Optional(
    t.String({
      description: 'Nombre de la cuenta',
      maxLength: 100
    })
  ),
  
  // ID de comercio/merchant (opcional)
  merchantId: t.Optional(
    t.String({
      description: 'ID de comercio o merchant ID',
      maxLength: 50
    })
  ),
  
  // Configuración adicional dependiente del banco
  additionalConfig: t.Optional(
    t.Object({
      // Credenciales de usuario (requerido para algunos bancos)
      username: t.Optional(t.String()),
      
      // Contraseña (requerido para algunos bancos)
      password: t.Optional(t.String()),
      
      // Clave de encriptación (opcional, utilizada para algunas integraciones)
      encryptionKey: t.Optional(t.String())
    })
  ),
  
  // Entorno (1=test, 2=prod)
  environment: t.Optional(
    t.Number({
      description: 'Entorno (1=test, 2=prod)',
      enum: [1, 2],
      default: 1
    })
  ),
  
  // Sucursal del banco (opcional)
  bankBranch: t.Optional(
    t.String({
      description: 'Sucursal del banco',
      maxLength: 50
    })
  ),
  
  // Estado inicial (opcional, por defecto 'active')
  status: t.Optional(
    t.String({
      description: 'Estado de la configuración',
      enum: ['active', 'inactive', 'error'],
      default: 'active'
    })
  )
});

export type CompanyBankInput = typeof CompanyBankSchema.static;

/**
 * Esquema para la respuesta del registro de banco para compañía
 */
export const CompanyBankResponseSchema = t.Object({
  id: t.Optional(t.Number()),
  bankId: t.Optional(t.Number()),
  bankName: t.Optional(t.String()),
  accountNumber: t.Optional(t.String()),
  status: t.Optional(t.String()),
  responseCode: t.Number(),
  message: t.String()
});

export type CompanyBankResponse = typeof CompanyBankResponseSchema.static;
