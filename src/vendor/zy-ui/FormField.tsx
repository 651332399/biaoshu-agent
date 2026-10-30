import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

import { cx } from "./cx";

type ControlProps = { id?: string | undefined; "aria-describedby"?: string | undefined; invalid?: boolean | undefined; required?: boolean | undefined };

export type FormFieldProps = {
  label: ReactNode;
  /** 控件 id；不传则自动生成并注入子控件。 */
  id?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** 在栅格里横跨整行。 */
  wide?: boolean;
  className?: string;
  children: ReactElement<ControlProps>;
};

/** 标签在上、说明在下、错误替换说明。子控件自动拿到 id / aria-describedby / invalid。 */
export function FormField({ label, id, required, hint, error, wide, className, children }: FormFieldProps) {
  const autoId = useId();
  const controlId = id ?? children.props.id ?? `field-${autoId}`;
  const noteId = `${controlId}-note`;
  const note = error ?? hint;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-describedby": cx(children.props["aria-describedby"], note ? noteId : undefined) || undefined,
        ...(error ? { invalid: true } : {}),
        ...(required ? { required: true } : {}),
      })
    : children;
  return (
    <div className={cx("zy-ui-field", wide && "zy-ui-field--wide", className)}>
      <label className={cx("zy-field-label", required && "zy-ui-label--required")} htmlFor={controlId}>
        {label}
      </label>
      {control}
      {note ? (
        <div id={noteId} className={error ? "zy-ui-field-error" : "zy-ui-field-hint"} role={error ? "alert" : undefined}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

/** 表单栅格：columns=2|3，窄屏自动单列。 */
export function FormGrid({ columns = 2, children, className }: { columns?: 2 | 3; children: ReactNode; className?: string }) {
  return <div className={cx("zy-ui-grid", `zy-ui-grid--${columns}`, className)}>{children}</div>;
}

/** 表单分组：组标题 + 可选说明。 */
export function FormSection({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="zy-ui-section">
      <div className="zy-ui-section-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
