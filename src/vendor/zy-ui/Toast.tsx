import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { cx } from "./cx";

export type ToastTone = "info" | "success" | "error";
type ToastInput = { title: ReactNode; description?: ReactNode; tone?: ToastTone | undefined };
type ToastEntry = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

let nextId = 0;

/** 挂在应用根部一次。成功提示 4 秒自动消失；错误提示 8 秒，并用 assertive 播报。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const push = useCallback((toast: ToastInput) => setToasts((current) => [...current, { ...toast, id: ++nextId }]), []);
  const drop = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
  return (
    <ToastContext.Provider value={push}>
      <ToastPrimitive.Provider label="通知" swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className={cx("zy-ui-toast", `zy-ui-toast--${toast.tone ?? "info"}`)}
            type={toast.tone === "error" ? "foreground" : "background"}
            duration={toast.tone === "error" ? 8000 : 4000}
            onOpenChange={(open: boolean) => {
              if (!open) drop(toast.id);
            }}
          >
            <ToastPrimitive.Title className="zy-ui-toast-title">{toast.title}</ToastPrimitive.Title>
            {toast.description ? <ToastPrimitive.Description className="zy-ui-toast-desc">{toast.description}</ToastPrimitive.Description> : null}
            <ToastPrimitive.Close className="zy-ui-icon-action" aria-label="关闭通知">
              <X size={14} aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="zy-ui-toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast 必须在 ToastProvider 内使用");
  return push;
}
