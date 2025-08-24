// import { z } from "zod";
// import dotenv from "dotenv";
// dotenv.config();

// export const env = z.object({
//     PORT: z.coerce.number().default(3000),


//     // MONGODB_URI: z.string().optional(),
//     // DATABASE_HOST: z.string().optional(),
//     // DATABASE_USER: z.string().optional(),
//     // DATABASE_PASSWORD: z.string().optional(),
//     // DATABASE_NAME: z.string().optional(),
// }).parse(process.env);





import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  FRONTEND_URL: z.string().url().trim().min(1),
});

export const env = envSchema.parse(process.env);


