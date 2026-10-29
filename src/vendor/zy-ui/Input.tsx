import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cx } from "./cx";

type Invalid = { invalid?: boolean };

/** 文本类输入（text / email / number / date …）。勾选、单选、文件请用 Checkbox / RadioGroup / FileUpload。 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Invalid>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx("zy-input", className)} aria-invalid={invalid || rest["aria-invalid"] || undefined} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx("zy-textarea", className)} aria-invalid={invalid || rest["aria-invalid"] || undefined} {...rest} />;
});
