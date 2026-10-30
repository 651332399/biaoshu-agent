import { X } from "lucide-react";
import { Dialog as DialogPrimitive, DropdownMenu as MenuPrimitive, Tabs as TabsPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, type ReactElement, type ReactNode } from "react";

import { cx } from "./cx";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** 底部操作区，主操作放最右。 */
  footer?: ReactNode;
  size?: "md" | "lg" | undefined;
  children?: ReactNode;
};

/** 模态对话框：焦点锁定、Esc 关闭、关闭后焦点回到触发处。 */
export function Dialog({ open, onOpenChange, title, description, footer, size = "md", children }: DialogProps) {
  // 受控打开时没有 Radix Trigger，自己记下打开前的焦点（通常是触发按钮），关闭时还回去。
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  }, [open]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="zy-ui-overlay" />
        <DialogPrimitive.Content
          className={cx("zy-ui-dialog", size === "lg" && "zy-ui-dialog--lg")}
          {...(description ? {} : { "aria-describedby": undefined })}
          onCloseAutoFocus={(event: Event) => {
            if (!opener.current?.isConnected) return;
            event.preventDefault();
            opener.current.focus();
          }}
        >
          <div className="zy-ui-dialog-head">
            <DialogPrimitive.Title className="zy-ui-dialog-title">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="zy-ui-icon-action" aria-label="关闭">
              <X size={16} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          {description ? <DialogPrimitive.Description className="zy-ui-dialog-desc">{description}</DialogPrimitive.Description> : null}
          {children ? <div className="zy-ui-dialog-body">{children}</div> : null}
          {footer ? <div className="zy-ui-dialog-foot">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export type MenuItem = { label: ReactNode; onSelect: () => void; danger?: boolean | undefined; disabled?: boolean | undefined };

/** 行内「更多」操作菜单。trigger 必须是可聚焦元素（通常是 Button）。 */
export function DropdownMenu({ trigger, items, align = "end" }: { trigger: ReactElement; items: readonly MenuItem[]; align?: "start" | "end" }) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content className="zy-ui-popover zy-ui-menu" align={align} sideOffset={4}>
          {items.map((item, index) => (
            <MenuPrimitive.Item key={index} className={cx("zy-ui-option", item.danger && "zy-ui-option--danger")} disabled={item.disabled} onSelect={item.onSelect}>
              {item.label}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

/** 悬停 / 聚焦提示。只放补充说明，不放操作必需的信息。 */
export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactElement; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="zy-ui-tooltip" side={side} sideOffset={6}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export type TabItem = { value: string; label: ReactNode; content: ReactNode; disabled?: boolean | undefined };

/** 页内分栏：方向键切换，内容区随选中项渲染。 */
export function Tabs({ items, value, onValueChange, "aria-label": ariaLabel }: { items: readonly TabItem[]; value: string; onValueChange: (value: string) => void; "aria-label"?: string | undefined }) {
  return (
    <TabsPrimitive.Root className="zy-ui-tabs" value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="zy-ui-tab-list" aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsPrimitive.Trigger key={item.value} value={item.value} disabled={item.disabled} className="zy-ui-tab">
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="zy-ui-tab-panel">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
