import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "text";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  block?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "zy-btn zy-btn--primary",
  secondary: "zy-btn",
  danger: "zy-btn zy-btn--danger",
  text: "zy-ui-btn-text",
};

/** 主 / 次 / 危险 / 文字按钮。loading 时禁用并显示转圈，宽度不跳动。 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, block = false, type = "button", disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("zy-ui-btn", VARIANT_CLASS[variant], size === "sm" && variant !== "text" && "zy-btn--sm", block && "zy-btn--block", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="spin" size={14} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
