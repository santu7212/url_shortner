import { name } from "ejs";
import z from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(3, { message: "Name must be at least 3 charecters long" })
  .max(100, { message: "Name must be no more than 100 charecters." });

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please Enter a valid E mail address" })
  .max(100, { message: "Email must be no more 100 charecter " });

export const loginUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(100, { message: " Email must be less than 100 charcecter " }),

  password: z
    .string()
    .min(6, { message: "Password must be at least 6 charecter long " })
    .max(100, { message: "Password must be less than 100 charecter " }),
});

export const registerUserSchema = loginUserSchema.extend({
  name: z
    .string()
    .trim()
    .min(3, { message: "Name must be at least 3 charecter long." })
    .max(100, { message: "Name must be less than 100 charecter." }),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().length(8),
  email: z.string().trim().email(),
});

export const verifyUserSchema = z.object({
  name: nameSchema,
});

export const verifyPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current Password is required!" }),
    newPassword: z
      .string()
      .min(6, { message: "New Password must be at least 6 characters long." })
      .max(100, {
        message: "New Password must be no more than 100 characters.",
      }),
    confirmPassword: z
      .string()
      .min(6, {
        message: "Confirm Password must be at least 6 characters long.",
      })
      .max(100, {
        message: "Confirm Password must be no more than 100 characters.",
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Password don't match",
        path: ["confirmPassword"],
      }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // Error will be associated with confirmPassword field
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});


const PassWordSchema=z.object({
  newPassword: z
    .string()
    .min(6, { message: "New Password must be at least 6 characters long." })
    .max(100, {
      message: "New Password must be no more than 100 characters.",
    }),
  confirmPassword: z
    .string()
    .min(6, {
      message: "Confirm Password must be at least 6 characters long.",
    })
    .max(100, {
      message: "Confirm Password must be no more than 100 characters.",
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Password don't match",
      path: ["confirmPassword"],
    }),
});

export const verifResetPasswordSchema = PassWordSchema
export const setPasswordSchema=PassWordSchema
