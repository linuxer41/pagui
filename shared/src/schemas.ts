import { Type, type TSchema } from '@sinclair/typebox'

export function SuccessSchema<T extends TSchema>(data: T) {
  return Type.Object({
    success: Type.Literal(true),
    data,
    message: Type.Optional(Type.String()),
  })
}

export function ListSuccessSchema<T extends TSchema>(data: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: Type.Array(data),
    totalCount: Type.Number(),
    message: Type.Optional(Type.String()),
  })
}

export const ErrorSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
  message: Type.Optional(Type.String()),
  details: Type.Optional(Type.Unknown()),
})

export const User = Type.Object({
  id: Type.String(),
  email: Type.String(),
  fullName: Type.String(),
  role: Type.Integer(),
  status: Type.String(),
})

export const LoginData = Type.Object({
  user: User,
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.String(),
})

export const LoginResponse = SuccessSchema(LoginData)
