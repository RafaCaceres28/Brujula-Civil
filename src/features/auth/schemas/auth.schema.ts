import { z } from 'zod';

const emailField = z.string().trim().email('Ingresa un email valido.');
const passwordField = z.string().min(8, 'La contrasena debe tener al menos 8 caracteres.');

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const registerSchema = loginSchema;

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const confirmPasswordResetSchema = z
  .object({
    password: passwordField,
    confirmPassword: passwordField,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas deben coincidir.',
  });

export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type RegisterSchemaInput = z.infer<typeof registerSchema>;
export type RequestPasswordResetSchemaInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetSchemaInput = z.infer<typeof confirmPasswordResetSchema>;
