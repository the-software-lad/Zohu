import { z } from 'zod';

export const signUpSchema = z.object({
    firstName: z.string().trim().min(1,"First Name is required"),
    lastName: z.string().trim().min(1,"Last Name is required"),
    email: z.email("Enter a valid email").trim().min(1,"Email is required"),
    password: z.string().trim().min(8,"Password must be alteast of 8 characters")
})
export type SignUpFormValues = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
    email: z.email("Enter a valid email").trim().min(1,"Email is required"),
    password: z.string().trim().min(1,"Password is required")
})
export type SignInFormValues = z.infer<typeof signInSchema>


export const codeSchema = z.object({
    code: z.string().trim().min(1,"Code is required")
})
export type CodeFormValues = z.infer<typeof codeSchema>