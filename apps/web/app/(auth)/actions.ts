"use server";

import { z } from "zod";
import { USERNAME_PATTERN } from "@/lib/account-auth";

import {
  createUser,
  getUser,
  getUserByUsername,
} from "@/lib/db/queries";

import { signIn } from "./auth";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(
    USERNAME_PATTERN,
    "Username must use letters, numbers, dots, underscores, or hyphens."
  );

const loginFormSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
});

const registerFormSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = loginFormSchema.parse({
      identifier: formData.get("identifier"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      identifier: validatedData.identifier,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = registerFormSchema.parse({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);
    const [usernameUser] = await getUserByUsername(validatedData.username);

    if (user || usernameUser) {
      return { status: "user_exists" } as RegisterActionState;
    }
    await createUser({
      email: validatedData.email,
      password: validatedData.password,
      username: validatedData.username,
    });
    await signIn("credentials", {
      identifier: validatedData.username,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
