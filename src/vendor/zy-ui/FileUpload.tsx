import { FileText, Upload, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type DragEvent, type InputHTMLAttributes } from "react";

import { cx } from "./cx";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** accept 语法与原生一致：".pdf,.docx,image/*,application/pdf"。空 accept 表示不限。 */
export function acceptsFile(file: File, accept: string | undefined) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean).some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** 把 accept 转成给人看的格式清单：".pdf,image/png,image/*" → "PDF / PNG / 图片"。 */
export function describeAccept(accept: string) {
  const labels = accept.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean).map((token) => {
    if (token.startsWith(".")) return token.slice(1).toUpperCase();
    if (token === "image/*") return "图片";
    return (token.split("/")[1] ?? token).toUpperCase();
  });
  return [...new Set(labels)].join(" / ");
}

/** 返回第一条不通过的原因（同时写明允许的类型 / 大小，便于用户修正）；全部通过返回 null。 */
export function validateFiles(files: readonly File[], { accept, maxSize, maxFiles }: { accept?: string | undefined; maxSize?: number | undefined; maxFiles?: number | undefined }) {
  if (maxFiles !== undefined && files.length > maxFiles) return `最多选择 ${maxFiles} 个文件`;
  for (const file of files) {
    if (!acceptsFile(file, accept)) return `「${file.name}」格式不支持，仅支持 ${describeAccept(accept ?? "")}`;
    if (maxSize !== undefined && file.size > maxSize) return `「${file.name}」超过 ${formatBytes(maxSize)}，请选择不超过 ${formatBytes(maxSize)} 的文件`;
  }
  return null;
}

/** 视觉隐藏的原生文件输入，供已有自定义投放区（如诊断材料卡片）调起系统选择框。新表单直接用 FileUpload。 */
export const HiddenFileInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function HiddenFileInput({ className, ...rest }, ref) {
  return <input ref={ref} type="file" className={cx("sr-only", className)} {...rest} />;
});

export type FileUploadProps = {
  /** 收到通过校验的文件；单选时数组长度为 1，点「移除」时为空数组。 */
  onFiles: (files: File[]) => void;
  /** 单选时用于预览的当前文件。多选场景由页面自己列出已选文件。 */
  value?: File | null | undefined;
  accept?: string | undefined;
  maxSize?: number | undefined;
  multiple?: boolean | undefined;
  maxFiles?: number | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  id?: string | undefined;
  hint?: string | undefined;
  /** 按钮文案，默认「选择文件」。 */
  buttonText?: string | undefined;
  className?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-describedby"?: string | undefined;
};

/** 拖拽或点击选择文件，校验类型与大小，单选时预览文件名 / 大小 / 图片缩略图。 */
export function FileUpload({ onFiles, value, accept, maxSize, multiple, maxFiles, disabled, invalid, id, hint, buttonText, className, ...aria }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreviewUrl(value);

  function take(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const picked = multiple ? files : files.slice(0, 1);
    const problem = validateFiles(picked, { accept, maxSize, maxFiles });
    setError(problem);
    if (!problem) onFiles(picked);
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) take(event.dataTransfer.files);
  }

  const errorId = id ? `${id}-upload-error` : undefined;
  return (
    <div className={cx("zy-ui-upload", className)}>
      <div
        className="zy-ui-dropzone"
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        aria-invalid={invalid || Boolean(error) || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={16} aria-hidden="true" />
        <span className="zy-ui-dropzone-text">拖拽文件到这里，或</span>
        <button
          id={id}
          type="button"
          className="zy-btn zy-btn--sm"
          disabled={disabled}
          aria-label={aria["aria-label"]}
          aria-describedby={cx(aria["aria-describedby"], error ? errorId : undefined) || undefined}
          onClick={() => inputRef.current?.click()}
        >
          {buttonText ?? "选择文件"}
        </button>
        {hint ? <span className="zy-ui-dropzone-hint">{hint}</span> : null}
        <HiddenFileInput
          ref={inputRef}
          tabIndex={-1}
          aria-hidden="true"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {error ? <div id={errorId} className="zy-ui-field-error" role="alert">{error}</div> : null}
      {value ? (
        <div className="zy-ui-file">
          {preview ? <img src={preview} alt="" className="zy-ui-file-thumb" /> : <FileText size={16} aria-hidden="true" />}
          <span className="zy-ui-file-name">{value.name}</span>
          <span className="zy-ui-file-size">{formatBytes(value.size)}</span>
          <button type="button" className="zy-ui-icon-action" aria-label={`移除 ${value.name}`} disabled={disabled} onClick={() => { setError(null); onFiles([]); }}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function usePreviewUrl(file: File | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/") || typeof URL.createObjectURL !== "function") {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
