/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { chooseOption } from "./test";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  DataTable,
  Dialog,
  DropdownMenu,
  FileUpload,
  FormField,
  Input,
  MultiSelect,
  RadioGroup,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  ToastProvider,
  Tooltip,
  useToast,
  validateFiles,
} from ".";

afterEach(cleanup);

const OPTIONS = [
  { value: "", label: "全部部门" },
  { value: "finance", label: "财务部" },
  { value: "sales", label: "销售部" },
  { value: "legal", label: "法务部", disabled: true },
];

describe("Button", () => {
  it("renders variants and blocks clicks while loading", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button variant="primary" onClick={onClick}>保存</Button>);
    const button = screen.getByRole("button", { name: "保存" });
    expect(button).toHaveClass("zy-btn", "zy-btn--primary");
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<Button variant="primary" loading onClick={onClick}>保存</Button>);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("maps danger / text / sm", () => {
    render(<><Button variant="danger" size="sm">下架</Button><Button variant="text">查看</Button></>);
    expect(screen.getByRole("button", { name: "下架" })).toHaveClass("zy-btn--danger", "zy-btn--sm");
    expect(screen.getByRole("button", { name: "查看" })).toHaveClass("zy-ui-btn-text");
  });
});

describe("FormField + Input / Textarea", () => {
  it("links label, hint and required marker to the control", () => {
    render(<FormField label="名称" required hint="最多 40 字"><Input value="" onChange={() => {}} /></FormField>);
    const input = screen.getByLabelText(/名称/);
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("最多 40 字");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("replaces the hint with the error and marks the control invalid", () => {
    render(<FormField label="描述" hint="选填" error="不能超过 300 字"><Textarea value="" onChange={() => {}} /></FormField>);
    const textarea = screen.getByLabelText("描述");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAccessibleDescription("不能超过 300 字");
    expect(screen.queryByText("选填")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("不能超过 300 字");
  });
});

function ControlledSelect({ initial = "", onChange }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <FormField label="部门">
      <Select options={OPTIONS} value={value} onValueChange={(next) => { setValue(next); onChange?.(next); }} />
    </FormField>
  );
}

describe("Select", () => {
  it("shows the empty-value option label and picks another option", () => {
    const onChange = vi.fn();
    render(<ControlledSelect onChange={onChange} />);
    const trigger = screen.getByLabelText("部门");
    expect(trigger).toHaveTextContent("全部部门");
    chooseOption(trigger, "财务部");
    expect(onChange).toHaveBeenCalledWith("finance");
    expect(trigger).toHaveTextContent("财务部");
    chooseOption(trigger, "全部部门");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("opens with the keyboard and keeps disabled options unselectable", () => {
    render(<ControlledSelect />);
    fireEvent.keyDown(screen.getByLabelText("部门"), { key: "ArrowDown" });
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: "法务部" });
    expect(option).toHaveAttribute("data-disabled");
  });

  it("shows the placeholder when nothing matches and supports disabled / invalid", () => {
    render(<Select options={OPTIONS.slice(1)} value="" onValueChange={() => {}} placeholder="请选择部门" disabled invalid aria-label="部门" />);
    const trigger = screen.getByRole("combobox", { name: "部门" });
    expect(trigger).toHaveTextContent("请选择部门");
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Combobox", () => {
  it("filters by search text and selects with Enter", () => {
    const onChange = vi.fn();
    render(<Combobox aria-label="成员" options={OPTIONS.slice(1)} value="" onValueChange={onChange} />);
    const trigger = screen.getByRole("combobox", { name: "成员" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "成员" })).toBeInTheDocument();
    const search = screen.getByRole("textbox");
    fireEvent.change(search, { target: { value: "销售" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("sales");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("navigates with arrow keys and shows an empty message", () => {
    const onChange = vi.fn();
    render(<Combobox aria-label="成员" options={OPTIONS.slice(1, 3)} value="" onValueChange={onChange} emptyText="无匹配" />);
    fireEvent.click(screen.getByRole("combobox", { name: "成员" }));
    const search = screen.getByRole("textbox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("sales");
    fireEvent.click(screen.getByRole("combobox", { name: "成员" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "不存在" } });
    expect(screen.getByText("无匹配")).toBeInTheDocument();
  });
});

describe("Combobox keyboard and form contract", () => {
  const MANY = Array.from({ length: 100 }, (_, index) => ({ value: `d${index + 1}`, label: `财务部 ${index + 1}` }));

  it("ignores Enter and arrows while an IME is composing", () => {
    const onChange = vi.fn();
    render(<Combobox aria-label="成员" options={OPTIONS.slice(1)} value="" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "成员" }));
    const search = screen.getByRole("textbox");
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });
    fireEvent.keyDown(search, { key: "Enter", keyCode: 229 });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("finance");
  });

  it("skips disabled options with the keyboard, including first and last", () => {
    const onChange = vi.fn();
    const options = [
      { value: "a", label: "离线 A", disabled: true },
      { value: "b", label: "可用 B" },
      { value: "c", label: "离线 C", disabled: true },
      { value: "d", label: "可用 D" },
      { value: "e", label: "离线 E", disabled: true },
    ];
    render(<Combobox aria-label="智能体" options={options} value="" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "智能体" }));
    const search = screen.getByRole("textbox");
    const highlighted = () => document.getElementById(search.getAttribute("aria-activedescendant") ?? "");
    expect(highlighted()).toHaveTextContent("可用 B");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(highlighted()).toHaveTextContent("可用 D");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(highlighted()).toHaveTextContent("可用 B");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(highlighted()).toHaveTextContent("可用 D");
    expect(screen.getByRole("option", { name: "离线 A" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.change(search, { target: { value: "离线" } });
    expect(search).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(search, { target: { value: "" } });
    fireEvent.keyDown(search, { key: "ArrowUp" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("d");
  });

  it("scrolls the highlighted option into view, including the selected one on open", () => {
    const scroll = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scroll;
    try {
      render(<Combobox aria-label="部门" options={MANY} value="d50" onValueChange={() => {}} />);
      fireEvent.click(screen.getByRole("combobox", { name: "部门" }));
      expect(scroll.mock.contexts.at(-1)).toHaveTextContent("财务部 50");
      const search = screen.getByRole("textbox");
      for (let index = 0; index < 20; index += 1) fireEvent.keyDown(search, { key: "ArrowDown" });
      expect(scroll.mock.contexts.at(-1)).toHaveTextContent("财务部 70");
      expect(scroll).toHaveBeenLastCalledWith({ block: "nearest" });
      expect(search).toHaveAttribute("aria-activedescendant", (scroll.mock.contexts.at(-1) as HTMLElement).id);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("joins native form submission and required validation", () => {
    function Harness() {
      const [dept, setDept] = useState("");
      const [tags, setTags] = useState<string[]>([]);
      return (
        <form aria-label="表单">
          <Combobox aria-label="部门" name="dept" required options={OPTIONS.slice(1)} value={dept} onValueChange={setDept} />
          <MultiSelect aria-label="标签" name="tags" options={OPTIONS.slice(1, 3)} values={tags} onValuesChange={setTags} />
        </form>
      );
    }
    render(<Harness />);
    const form = screen.getByRole("form", { name: "表单" }) as HTMLFormElement;
    const dept = screen.getByRole("combobox", { name: "部门" });
    expect(dept).toHaveAttribute("aria-required", "true");
    expect(form.checkValidity()).toBe(false);
    chooseOption(dept, "销售部");
    const tags = screen.getByRole("combobox", { name: "标签" });
    chooseOption(tags, "财务部");
    chooseOption(tags, "销售部");
    expect(form.checkValidity()).toBe(true);
    const data = new FormData(form);
    expect(data.get("dept")).toBe("sales");
    expect(data.getAll("tags")).toEqual(["finance", "sales"]);
  });
});

describe("MultiSelect", () => {
  it("toggles values and summarises the trigger", () => {
    function Harness() {
      const [values, setValues] = useState<string[]>([]);
      return <MultiSelect aria-label="可见企业" options={OPTIONS.slice(1, 3)} values={values} onValuesChange={setValues} placeholder="不限" />;
    }
    render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "可见企业" });
    expect(trigger).toHaveTextContent("不限");
    chooseOption(trigger, "财务部");
    chooseOption(trigger, "销售部");
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    expect(trigger).toHaveTextContent("财务部、销售部");
    chooseOption(trigger, "财务部");
    expect(trigger).toHaveTextContent("销售部");
  });
});

describe("Checkbox / Switch / RadioGroup", () => {
  it("toggles a labelled checkbox by clicking its text", () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onChange}>头像按立绘展示</Checkbox>);
    const box = screen.getByRole("checkbox", { name: "头像按立绘展示" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByText("头像按立绘展示"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled and exposes indeterminate", () => {
    const onChange = vi.fn();
    render(<><Checkbox checked onCheckedChange={onChange} disabled aria-label="脱敏" /><Checkbox checked="indeterminate" aria-label="全选" /></>);
    fireEvent.click(screen.getByRole("checkbox", { name: "脱敏" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "全选" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("switch reports the next state", () => {
    const onChange = vi.fn();
    render(<Switch checked onCheckedChange={onChange}>启用自动同步</Switch>);
    const control = screen.getByRole("switch", { name: "启用自动同步" });
    expect(control).toHaveAttribute("aria-checked", "true");
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("radio group selects by click", () => {
    const onChange = vi.fn();
    render(<RadioGroup aria-label="接入类型" options={[{ value: "api", label: "API 型" }, { value: "web_app", label: "自带页面型" }]} value="api" onValueChange={onChange} />);
    expect(screen.getByRole("radio", { name: "API 型" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "自带页面型" }));
    expect(onChange).toHaveBeenCalledWith("web_app");
  });
});

describe("FileUpload", () => {
  const png = () => new File(["x".repeat(10)], "avatar.png", { type: "image/png" });

  it("validates type and size", () => {
    expect(validateFiles([png()], { accept: "image/png,image/jpeg" })).toBeNull();
    expect(validateFiles([png()], { accept: ".pdf" })).toBe("「avatar.png」格式不支持，仅支持 PDF");
    expect(validateFiles([png()], { accept: ".doc,.docx,application/pdf,image/*" })).toBe(null);
    expect(validateFiles([new File(["x"], "a.txt", { type: "text/plain" })], { accept: "image/png,image/jpeg,image/webp" })).toBe("「a.txt」格式不支持，仅支持 PNG / JPEG / WEBP");
    expect(validateFiles([png()], { maxSize: 5 })).toBe("「avatar.png」超过 5 B，请选择不超过 5 B 的文件");
    expect(validateFiles([png(), png()], { maxFiles: 1 })).toBe("最多选择 1 个文件");
    expect(validateFiles([png()], { accept: "image/*" })).toBeNull();
  });

  it("accepts a dropped file and rejects an oversized one with an error", () => {
    const onFiles = vi.fn();
    const { container } = render(<FileUpload aria-label="上传头像" accept="image/png" maxSize={5} onFiles={onFiles} />);
    const zone = container.querySelector(".zy-ui-dropzone")!;
    fireEvent.drop(zone, { dataTransfer: { files: [png()] } });
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("超过 5 B");
  });

  it("picks via the hidden input, previews and removes", () => {
    const onFiles = vi.fn();
    const file = png();
    const { container, rerender } = render(<FileUpload aria-label="上传头像" accept="image/png" onFiles={onFiles} />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    expect(input).toHaveAttribute("aria-hidden", "true");
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    rerender(<FileUpload aria-label="上传头像" accept="image/png" value={file} onFiles={onFiles} />);
    expect(screen.getByText("avatar.png")).toBeInTheDocument();
    expect(screen.getByText("10 B")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "移除 avatar.png" }));
    expect(onFiles).toHaveBeenLastCalledWith([]);
  });

  it("disables the picker button", () => {
    render(<FileUpload aria-label="上传头像" disabled onFiles={() => {}} />);
    expect(screen.getByRole("button", { name: "上传头像" })).toBeDisabled();
  });
});

describe("Dialog / DropdownMenu / Tooltip / Tabs", () => {
  it("dialog renders title, footer and closes on Escape", () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange} title="下架员工" description="下架后企业不可再雇佣" footer={<Button variant="danger">下架</Button>}>确认？</Dialog>);
    const dialog = screen.getByRole("dialog", { name: "下架员工" });
    expect(dialog).toHaveAccessibleDescription("下架后企业不可再雇佣");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("returns focus to the opener after cancel, Escape and confirm", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>下架</Button>
          <Dialog open={open} onOpenChange={setOpen} title="确认下架" footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button variant="danger" onClick={() => setOpen(false)}>确认</Button></>} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "下架" });
    for (const close of [
      () => fireEvent.click(screen.getByRole("button", { name: "取消" })),
      () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }),
      () => fireEvent.click(screen.getByRole("button", { name: "确认" })),
    ]) {
      opener.focus();
      fireEvent.click(opener);
      await screen.findByRole("dialog", { name: "确认下架" });
      close();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(opener).toHaveFocus();
    }
  });

  it("dropdown menu runs the selected item", () => {
    const onEdit = vi.fn();
    render(<DropdownMenu trigger={<Button>更多</Button>} items={[{ label: "编辑", onSelect: onEdit }, { label: "删除", onSelect: () => {}, danger: true, disabled: true }]} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "更多" }), { key: "Enter" });
    expect(screen.getByRole("menuitem", { name: "删除" })).toHaveAttribute("data-disabled");
    fireEvent.click(screen.getByRole("menuitem", { name: "编辑" }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("tooltip shows on focus", async () => {
    render(<Tooltip content="保存后不可修改"><button>runtime_key</button></Tooltip>);
    fireEvent.focus(screen.getByRole("button", { name: "runtime_key" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("保存后不可修改");
  });

  it("tabs switch panels", () => {
    function Harness() {
      const [tab, setTab] = useState("a");
      return <Tabs aria-label="设置" value={tab} onValueChange={setTab} items={[{ value: "a", label: "基础", content: "基础面板" }, { value: "b", label: "高级", content: "高级面板" }]} />;
    }
    render(<Harness />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("基础面板");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "高级" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "高级" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("高级面板");
  });
});

describe("Toast", () => {
  it("pushes a toast through useToast", () => {
    function Trigger() {
      const toast = useToast();
      return <Button onClick={() => toast({ title: "已保存", description: "员工草稿已创建", tone: "success" })}>保存</Button>;
    }
    render(<ToastProvider><Trigger /></ToastProvider>);
    act(() => fireEvent.click(screen.getByRole("button", { name: "保存" })));
    expect(screen.getByText("已保存")).toBeInTheDocument();
    expect(screen.getByText("员工草稿已创建")).toBeInTheDocument();
  });

  it("throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow("ToastProvider");
    spy.mockRestore();
  });
});

describe("Badge / DataTable", () => {
  it("badge maps tones and statuses", () => {
    render(<><Badge tone="red">已下架</Badge><StatusBadge status="published" label="已上架" /><StatusBadge status="unknown" label="其他" /></>);
    expect(screen.getByText("已下架")).toHaveClass("zy-chip--red");
    expect(screen.getByText("已上架")).toHaveClass("zy-chip--green");
    expect(screen.getByText("其他")).toHaveClass("zy-chip--grey");
  });

  const columns = [
    { key: "name", header: "员工", render: (row: { id: string; name: string; runs: number }) => row.name },
    { key: "runs", header: "运行", align: "end" as const, render: (row: { id: string; name: string; runs: number }) => row.runs },
  ];

  it("renders rows, loading and empty states", () => {
    const rows = [{ id: "1", name: "审核专员", runs: 12 }];
    const { rerender } = render(<DataTable aria-label="员工目录" columns={columns} rows={rows} rowKey={(row) => row.id} />);
    const table = screen.getByRole("table", { name: "员工目录" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["员工", "运行"]);
    expect(within(table).getByRole("cell", { name: "12" })).toHaveClass("zy-ui-cell--end");
    rerender(<DataTable aria-label="员工目录" columns={columns} rows={rows} rowKey={(row) => row.id} loading />);
    expect(screen.getByRole("status", { name: "加载中" })).toBeInTheDocument();
    expect(screen.queryByText("审核专员")).toBeNull();
    rerender(<DataTable aria-label="员工目录" columns={columns} rows={[]} rowKey={(row) => row.id} empty="还没有员工" />);
    expect(screen.getByText("还没有员工")).toBeInTheDocument();
  });

  it("paginates", () => {
    const onPageChange = vi.fn();
    render(<DataTable aria-label="员工目录" columns={columns} rows={[{ id: "1", name: "a", runs: 1 }]} rowKey={(row) => row.id} pagination={{ page: 1, pageSize: 20, total: 45, onPageChange }} />);
    expect(screen.getByText("共 45 条 · 第 1 / 3 页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
