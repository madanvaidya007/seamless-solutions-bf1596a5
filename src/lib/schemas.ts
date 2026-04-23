import { z } from "zod";

export const intakeSchema = z.object({
  chief_complaint: z.string().trim().min(3).max(500),
  symptoms: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  body_regions: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  duration_days: z.number().int().min(0).max(3650),
  severity: z.number().int().min(1).max(10),
  age: z.number().int().min(0).max(130),
  sex: z.enum(["male", "female", "other"]),
  vitals: z
    .object({
      heart_rate: z.number().min(20).max(250).optional(),
      systolic_bp: z.number().min(50).max(260).optional(),
      diastolic_bp: z.number().min(30).max(180).optional(),
      temperature_c: z.number().min(28).max(45).optional(),
      respiratory_rate: z.number().min(4).max(60).optional(),
      spo2: z.number().min(50).max(100).optional(),
    })
    .partial()
    .optional(),
  medical_history: z.string().max(2000).optional(),
  current_medications: z.string().max(1000).optional(),
  allergies: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(["patient", "doctor"]),
});

export const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});
