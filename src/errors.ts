import { HTTP_STATUS, CONTENT_TYPES } from './constants';

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export function createErrorResponse(message: string, status: number = HTTP_STATUS.BAD_REQUEST): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": CONTENT_TYPES.JSON },
  });
}
