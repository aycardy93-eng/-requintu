// Error con código HTTP para que las rutas puedan cortar el flujo sin repetir res.status(...).json(...)
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Envuelve un handler async: centraliza el try/catch y el 500 'Error en el servidor'.
export const asyncHandler = (handler, mensajeServidor = 'Error en el servidor') => (
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ message: error.message });
      }
      res.status(500).json({ message: mensajeServidor, error: error.message });
    }
  }
);
