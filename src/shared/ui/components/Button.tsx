import { cx } from "hono/css";
import type { FC } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import { type ButtonSize, type ButtonVariant, buttonClass } from "../theme.js";

type ButtonProps = JSX.IntrinsicElements["button"] & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const Button: FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  class: className,
  ...rest
}) => {
  return <button class={cx(buttonClass(variant, size, { fullWidth }), className)} {...rest} />;
};

export default Button;
