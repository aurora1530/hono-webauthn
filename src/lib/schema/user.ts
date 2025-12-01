import z from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9]+$/, { message: "ユーザー名は半角英数字のみ使用できます。" });

export { usernameSchema };
