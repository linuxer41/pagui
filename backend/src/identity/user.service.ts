import bcrypt from 'bcrypt'
import { nextSnowflake } from '../shared/snowflake'
import { AppError } from '../shared/errors/app-error'
import { userRepository, type UserRow, type CreateUserData, type UpdateUserData } from './user.repository'

export const userService = {
  async create(data: { email: string; password: string; fullName: string; phone?: string; address?: string; roleId: bigint }): Promise<UserRow> {
    if (await userRepository.existsByEmail(data.email)) {
      throw new AppError(400, 'El email ya está registrado')
    }
    const hash = await bcrypt.hash(data.password, 10)
    return userRepository.create({ id: nextSnowflake(), ...data, password: hash })
  },

  getById(id: bigint): Promise<UserRow | null> {
    return userRepository.getById(id)
  },

  getByEmail(email: string): Promise<(UserRow & { password: string }) | null> {
    return userRepository.getByEmail(email)
  },

  list(filters: Parameters<typeof userRepository.list>[0]) {
    return userRepository.list(filters)
  },

  async update(id: bigint, data: UpdateUserData): Promise<UserRow> {
    const user = await userRepository.getById(id)
    if (!user) throw new AppError(404, 'Usuario no encontrado')
    return userRepository.update(id, data)
  },

  async changePassword(id: bigint, newPassword: string): Promise<void> {
    const user = await userRepository.getById(id)
    if (!user) throw new AppError(404, 'Usuario no encontrado')
    const hash = await bcrypt.hash(newPassword, 10)
    await userRepository.updatePassword(id, hash)
  },

  async delete(id: bigint): Promise<void> {
    const user = await userRepository.getById(id)
    if (!user) throw new AppError(404, 'Usuario no encontrado')
    await userRepository.softDelete(id)
  },
}
