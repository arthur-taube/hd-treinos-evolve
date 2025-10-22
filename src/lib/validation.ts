import { z } from "zod";

/**
 * Validation schemas for user inputs
 * Ensures data integrity and prevents injection attacks
 */

// Custom exercise name validation (max 45 characters as per database constraint)
export const customExerciseNameSchema = z.string()
  .trim()
  .min(1, "Nome do exercício é obrigatório")
  .max(45, "Nome do exercício deve ter no máximo 45 caracteres")
  .regex(/^[a-zA-Z0-9\sáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\-_.()]+$/, "Nome contém caracteres inválidos");

// Exercise observation validation (max 1000 characters as per database constraint)
export const exerciseObservationSchema = z.string()
  .max(1000, "Observação deve ter no máximo 1000 caracteres")
  .optional()
  .nullable();

// Exercise note validation
export const exerciseNoteSchema = z.string()
  .max(500, "Nota deve ter no máximo 500 caracteres")
  .optional()
  .nullable();

// Program name validation
export const programNameSchema = z.string()
  .trim()
  .min(1, "Nome do programa é obrigatório")
  .max(100, "Nome do programa deve ter no máximo 100 caracteres");

// Exercise name validation for user exercises (max 100 characters as per database constraint)
export const exerciseNameSchema = z.string()
  .trim()
  .min(1, "Nome do exercício é obrigatório")
  .max(100, "Nome do exercício deve ter no máximo 100 caracteres");

// Series validation
export const seriesSchema = z.number()
  .int("Número de séries deve ser inteiro")
  .min(1, "Número de séries deve ser no mínimo 1")
  .max(20, "Número de séries deve ser no máximo 20");

// Repetitions range validation
export const repsRangeSchema = z.string()
  .regex(/^\d+-\d+$/, "Formato de repetições inválido (use: min-max)")
  .refine((val) => {
    const [min, max] = val.split('-').map(Number);
    return min > 0 && max > min && max <= 100;
  }, "Faixa de repetições inválida");

// Weight validation
export const weightSchema = z.number()
  .min(0, "Peso não pode ser negativo")
  .max(1000, "Peso deve ser no máximo 1000 kg");
