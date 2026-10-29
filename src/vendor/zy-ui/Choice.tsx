import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cx } from "./cx";
import type { SelectOption } from "./Select";

type ToggleProps = {
  checked: boolean | "indeterminate";
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  invalid?: boolean | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
  /** 文字标签；点击文字同样切换。 */
  children?: ReactNode;
};

/** 复选框：提交型表单里的「是 / 否」选项。即时生效的开关用 Switch。 */
export function Checkbox({ checked, onCheckedChange, disabled, id, name, required, invalid, className, children, ...aria }: ToggleProps) {
  const box = (
    <CheckboxPrimitive.Root
      id={id}
      name={name}
      required={required}
      className="zy-ui-checkbox"
      checked={checked}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      onCheckedChange={(next: boolean | "indeterminate") => onCheckedChange?.(next === true)}
    >
      <CheckboxPrimitive.Indicator className="zy-ui-checkbox-mark">
        {checked === "indeterminate" ? <Minus size={12} strokeWidth={3} aria-hidden="true" /> : <Check size={12} strokeWidth={3} aria-hidden="true" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  if (children === undefined) return box;
  return (
    <label className={cx("zy-ui-choice", disabled && "is-disabled", className)}>
      {box}
      <span>{children}</span>
    </label>
  );
}

/** 开关：切换即生效（启用 / 停用）。 */
export function Switch({ checked, onCheckedChange, disabled, id, name, required, invalid, className, children, ...aria }: ToggleProps) {
  const control = (
    <SwitchPrimitive.Root
      id={id}
      name={name}
      required={required}
      className="zy-ui-switch"
      checked={checked === true}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      onCheckedChange={(next: boolean) => onCheckedChange?.(next)}
    >
      <SwitchPrimitive.Thumb className="zy-ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
  if (children === undefined) return control;
  return (
    <label className={cx("zy-ui-choice", disabled && "is-disabled", className)}>
      {control}
      <span>{children}</span>
    </label>
  );
}

export type RadioGroupProps = {
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  orientation?: "horizontal" | "vertical" | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  invalid?: boolean | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
};

/** 单选组：选项 ≤ 5 个且需要同时看到全部选项时用，否则用 Select。 */
export function RadioGroup({ options, value, onValueChange, orientation = "horizontal", disabled, id, name, invalid, className, ...aria }: RadioGroupProps) {
  return (
    <RadioPrimitive.Root
      id={id}
      name={name}
      className={cx("zy-ui-radio-group", orientation === "vertical" && "zy-ui-radio-group--vertical", className)}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
    >
      {options.map((option) => (
        <label key={option.value} className={cx("zy-ui-choice", (disabled || option.disabled) && "is-disabled")}>
          <RadioPrimitive.Item className="zy-ui-radio" value={option.value} disabled={option.disabled}>
            <RadioPrimitive.Indicator className="zy-ui-radio-dot" />
          </RadioPrimitive.Item>
          <span>{option.label}</span>
        </label>
      ))}
    </RadioPrimitive.Root>
  );
}
