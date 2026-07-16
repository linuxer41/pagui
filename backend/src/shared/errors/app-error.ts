export class AppError extends Error {
  public status: number
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.status = statusCode
  }
}
