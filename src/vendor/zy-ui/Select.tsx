import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, Select as SelectPrimitive } from "radix-ui";
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./cx";

export type SelectOption = { value: string; label: ReactNode; disabled?: boolean | undefined; keywords?: string | undefined };

type BaseProps = {
  options: readonly SelectOption[];
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  size?: "md" | "sm" | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
};

// Radix Select 不接受空字符串作为选项值；页面里 "" 常表示「全部 / 未分配」，这里做一次编解码。
const EMPTY = "__zy_empty__";
const encode = (value: string) => (value === "" ? EMPTY : value);
const decode = (value: string) => (value === EMPTY ? "" : value);

export type SelectProps = BaseProps & { value: string; onValueChange: (value: string) => void };

/** 单选下拉。选项超过约 8 个、需要搜索时用 Combobox。 */
export function Select({ options, value, onValueChange, placeholder, disabled, invalid, required, id, name, size, className, ...aria }: SelectProps) {
  const hasEmptyOption = options.some((option) => option.value === "");
  return (
    <SelectPrimitive.Root
      value={value === "" && !hasEmptyOption ? "" : encode(value)}
      onValueChange={(next: string) => onValueChange(decode(next))}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cx("zy-ui-trigger", size === "sm" && "zy-ui-trigger--sm", className)}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={invalid || undefined}
      >
        <SelectPrimitive.Value placeholder={placeholder ?? "请选择"} />
        <SelectPrimitive.Icon className="zy-ui-trigger-icon">
          <ChevronDown size={14} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="zy-ui-popover zy-ui-listbox" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item key={option.value} value={encode(option.value)} disabled={option.disabled} className="zy-ui-option">
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="zy-ui-option-check">
                  <Check size={14} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function optionText(option: SelectOption) {
  return `${typeof option.label === "string" ? option.label : ""} ${option.keywords ?? ""} ${option.value}`.toLowerCase();
}

function filterOptions(options: readonly SelectOption[], query: string) {
  const needle = query.trim().toLowerCase();
  return needle ? options.filter((option) => optionText(option).includes(needle)) : options;
}

/** 从 from 起按 step 方向找下一个可用项（循环）；没有可用项时返回 -1。禁用项照常展示，但键盘不停留。 */
function nextEnabled(options: readonly SelectOption[], from: number, step: 1 | -1) {
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (((from + step * offset) % options.length) + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

type ListProps = BaseProps & {
  selected: readonly string[];
  multiple: boolean;
  onToggle: (value: string) => void;
  triggerText: ReactNode;
  searchPlaceholder?: string | undefined;
  emptyText?: string | undefined;
};

/** Combobox 与 MultiSelect 共用：Popover + 搜索框 + listbox（aria-activedescendant 键盘导航）。 */
function SearchList({ options, selected, multiple, onToggle, triggerText, placeholder, searchPlaceholder, emptyText, disabled, invalid, required, id, name, size, className, ...aria }: ListProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;
  const visible = useMemo(() => filterOptions(options, query), [options, query]);
  const activeOption = visible[Math.min(active, visible.length - 1)];
  const activeId = activeOption ? `${listId}-${activeOption.value}` : undefined;

  // 键盘移动高亮（含打开时定位到已选项）后把它滚进可见区域，避免 Enter 选中看不见的项。
  const [list, setList] = useState<HTMLUListElement | null>(null);
  useEffect(() => {
    if (list && activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [list, activeId]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      const current = options.findIndex((option) => selected.includes(option.value) && !option.disabled);
      setActive(current >= 0 ? current : nextEnabled(options, -1, 1));
    }
  }
  function pick(option: SelectOption | undefined) {
    if (!option || option.disabled) return;
    onToggle(option.value);
    if (!multiple) setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 中文输入法组字时的回车 / 方向键属于输入法，不是选项操作。
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        const from = Math.min(current, visible.length - 1);
        // 还没有高亮项时，↑ 从末尾开始找。
        return nextEnabled(visible, from < 0 && step < 0 ? visible.length : from, step);
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(activeOption);
    }
  }

  const hasValue = selected.length > 0;
  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        className={cx("zy-ui-trigger", size === "sm" && "zy-ui-trigger--sm", className)}
        data-placeholder={hasValue ? undefined : ""}
      >
        <span className="zy-ui-trigger-text">{hasValue ? triggerText : placeholder ?? "请选择"}</span>
        <ChevronDown className="zy-ui-trigger-icon" size={14} aria-hidden="true" />
      </Popover.Trigger>
      {multiple && name ? selected.map((value) => <input key={value} type="hidden" name={name} value={value} />) : null}
      {required || (name && !multiple) ? (
        // 让 FormData 与原生必填校验也能看到取值；视觉与读屏都隐藏，校验提示锚在触发器位置。
        <input
          className="zy-ui-native-proxy"
          aria-hidden="true"
          tabIndex={-1}
          name={multiple ? undefined : name}
          required={required}
          disabled={disabled}
          value={selected.join(",")}
          onChange={() => {}}
          onFocus={() => document.getElementById(triggerId)?.focus()}
        />
      ) : null}
      <Popover.Portal>
        <Popover.Content className="zy-ui-popover zy-ui-listbox zy-ui-search-list" align="start" sideOffset={4} aria-label={aria["aria-label"] ?? "选项"}>
          <div className="zy-ui-search">
            <Search size={14} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              placeholder={searchPlaceholder ?? "搜索"}
              aria-label={searchPlaceholder ?? "搜索选项"}
              aria-controls={listId}
              aria-activedescendant={activeId}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(nextEnabled(filterOptions(options, event.target.value), -1, 1));
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <ul ref={setList} id={listId} role="listbox" aria-multiselectable={multiple || undefined} aria-label={aria["aria-label"] ?? "选项"}>
            {visible.length === 0 ? <li className="zy-ui-list-empty">{emptyText ?? "没有匹配的选项"}</li> : null}
            {visible.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={`${listId}-${option.value}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  data-highlighted={option === activeOption ? "" : undefined}
                  className="zy-ui-option"
                  onMouseEnter={() => {
                    if (!option.disabled) setActive(visible.indexOf(option));
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {multiple ? <span className="zy-ui-option-box" data-state={isSelected ? "checked" : "unchecked"} aria-hidden="true">{isSelected ? <Check size={12} /> : null}</span> : null}
                  <span>{option.label}</span>
                  {!multiple && isSelected ? <Check className="zy-ui-option-check" size={14} aria-hidden="true" /> : null}
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export type ComboboxProps = BaseProps & {
  value: string;
  onValueChange: (value: string) => void;
  searchPlaceholder?: string | undefined;
  emptyText?: string | undefined;
};

/** 可搜索的单选下拉。 */
export function Combobox({ value, onValueChange, ...rest }: ComboboxProps) {
  const current = rest.options.find((option) => option.value === value);
  return <SearchList {...rest} multiple={false} selected={current ? [value] : []} onToggle={onValueChange} triggerText={current?.label} />;
}

export type MultiSelectProps = BaseProps & {
  values: readonly string[];
  onValuesChange: (values: string[]) => void;
  searchPlaceholder?: string | undefined;
  emptyText?: string | undefined;
};

/** 可搜索的多选下拉；触发器显示前两项 + 计数。 */
export function MultiSelect({ values, onValuesChange, ...rest }: MultiSelectProps) {
  const labels = rest.options.filter((option) => values.includes(option.value)).map((option) => option.label);
  const triggerText = labels.length > 2 ? <>{labels[0]}、{labels[1]} 等 {labels.length} 项</> : labels.map((label, index) => <span key={index}>{index ? "、" : ""}{label}</span>);
  return (
    <SearchList
      {...rest}
      multiple
      selected={values}
      triggerText={triggerText}
      onToggle={(value) => onValuesChange(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value])}
    />
  );
}
