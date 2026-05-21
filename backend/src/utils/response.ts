import { Response } from 'express'
import { ApiResponse, PaginatedResponse } from '../types/index.js'

/**
 * Send a successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
): void {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  }
  res.status(statusCode).json(response)
}

/**
 * Send an error API response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 400,
  message: string = 'Error',
): void {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  }
  res.status(statusCode).json(response)
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200,
): void {
  const pages = Math.ceil(total / limit)
  
  const response = {
    success: true,
    message: 'Success',
    data: {
      items,
      total,
      page,
      limit,
      pages,
    } as PaginatedResponse<T>,
  }
  
  res.status(statusCode).json(response)
}
