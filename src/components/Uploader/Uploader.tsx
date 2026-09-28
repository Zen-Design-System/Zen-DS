import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button, IconButton } from "../Button";
import { FileIcon, fileIconFormatOf } from "../FileIcon";
import { Icon } from "../Icon";
import { ProgressBar } from "../Progress";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./uploader.css";
import "../Icon/core";

export type UploaderFileState = "uploading" | "uploaded" | "replaceable" | "alert";

export interface UploaderFile {
  id: string;
  name: string;
  /** Pre-formatted size, e.g. "1.2 MB". */
  size?: string;
  state?: UploaderFileState;
  /** 0–100 while uploading. */
  progress?: number;
  /** Figma Additional Caption while uploading, e.g. "7 seconds left". */
  caption?: ReactNode;
  /** Error text for State=Alert. */
  error?: ReactNode;
  /** Figma Thumbnail=Photo: an image URL. */
  previewUrl?: string;
}


export interface UploaderFileItemProps {
  file: UploaderFile;
  /** Figma Thumbnail: none · file (icon-media-file 36px via FileIcon) · photo (previewUrl). Defaults to photo when previewUrl is set. */
  thumbnail?: "none" | "file" | "photo";
  /** Figma Theme: Default (Surface + Pale border) · Overlay (Liquid-Glass/Normal + Effect/Overlay, no border — for photos, dark or busy backgrounds). */
  theme?: "default" | "overlay";
  onRemove?: (file: UploaderFile) => void;
  /** Replaceable: swap the file. */
  onReplace?: (file: UploaderFile) => void;
  /** Alert: try again. */
  onRetry?: (file: UploaderFile) => void;
}

/**
 * Figma Primitives/Uploader/File-Item (1581:22739): padding Medium, gap Small, Corner-Radius/Large.
 * Name Body/Base/Bold · details Caption/Regular Neutral/Light (gap XSmall, 4px dot) · 8px Neutral progress while uploading.
 * Alert switches to Negative/Subtle with the error as help text. Actions are 16px icons 12px apart (24px hit areas).
 */
export function UploaderFileItem({ file, thumbnail, theme = "default", onRemove, onReplace, onRetry }: UploaderFileItemProps) {
  const t = useZenLabels();
  const state = file.state ?? "uploaded";
  const kind = thumbnail ?? (file.previewUrl ? "photo" : "none");
  return (
    <li className="zen-upload-file" data-state={state} data-tone={theme}>
      <div className="zen-upload-file__row">
        {kind === "file" ? <FileIcon className="zen-upload-file__type" format={fileIconFormatOf(file.name)} size="xl" /> : null}
        {kind === "photo" && file.previewUrl ? <img className="zen-upload-file__photo" src={file.previewUrl} alt="" /> : null}
        <div className="zen-upload-file__content">
          <div className="zen-upload-file__main">
            <span className={`zen-upload-file__name ${typographyStyles["Body/Base/Bold"]}`} title={file.name}>{file.name}</span>
            <span className="zen-upload-file__actions">
              {state === "replaceable" && onReplace ? <IconButton appearance="flat" level="primary" size="2xs" aria-label={t.replaceFile(file.name)} onClick={() => onReplace(file)} icon={<Icon name="icon-refresh-ccw-02-line" />} /> : null}
              {state === "alert" && onRetry ? <IconButton appearance="flat" level="primary" size="2xs" aria-label={t.retryFile(file.name)} onClick={() => onRetry(file)} icon={<Icon name="icon-refresh-ccw-01-line" />} /> : null}
              {onRemove ? <IconButton appearance="flat" level="primary" size="2xs" aria-label={state === "uploading" ? t.cancelUpload(file.name) : t.removeItem(file.name)} onClick={() => onRemove(file)} icon={<Icon name="icon-x-small-line" />} /> : null}
            </span>
          </div>
          <div className={`zen-upload-file__details ${typographyStyles["Caption/Regular"]}`}>
            {state === "alert" && file.error ? <span className="zen-upload-file__error" role="alert"><Icon name="icon-alert-circle-line" decorative />{file.error}</span> : null}
            {state === "alert" && file.error && file.size ? <span className="zen-upload-file__dot" aria-hidden="true" /> : null}
            {file.size ? <span>{file.size}</span> : null}
            {state === "uploading" && file.caption ? <><span className="zen-upload-file__dot" aria-hidden="true" /><span>{file.caption}</span></> : null}
          </div>
        </div>
      </div>
      {state === "uploading" ? <ProgressBar value={file.progress ?? 0} theme="neutral" aria-label={t.uploadingFile(file.name)} /> : null}
    </li>
  );
}

export interface FileUploadProps {
  /** Figma hasLabel. */
  label?: ReactNode;
  /** Figma hasHelperText (or the error text when `error` is set). */
  helpText?: ReactNode;
  /** Field-level error (State=Alert on the drop zone), e.g. "Max 800 KB". */
  error?: ReactNode;
  /** Figma Type: Drag & Drop (dropzone) or Browse Button. */
  type?: "dropzone" | "button";
  /** Dropzone text and caption (Figma Text / Caption). Default text: the locale's “Drag & Drop or Choose file to upload”. */
  text?: ReactNode;
  caption?: ReactNode;
  accept?: string;
  multiple?: boolean;
  /** Called with the picked or dropped files; the app uploads them and feeds `files` back. */
  onFilesAdd?: (files: File[]) => void;
  /** Figma File List: the files to show under the field. */
  files?: UploaderFile[];
  thumbnail?: UploaderFileItemProps["thumbnail"];
  onRemove?: (file: UploaderFile) => void;
  onReplace?: (file: UploaderFile) => void;
  onRetry?: (file: UploaderFile) => void;
  /** Browse button label. Default: the locale's “Choose File”. */
  buttonLabel?: ReactNode;
  /** Figma DragDrop-Field Extended: Yes (default) stacks icon, text and caption; No is a single 48px row (icon + text). */
  extended?: boolean;
  className?: string;
}

/**
 * Figma Uploader/File-Upload (1581:22708): Label → Drag & Drop field (Primitives/Uploader/DragDrop-Field, Extended) or a
 * “Choose File” button → Help-Text → File-Item list (gap XSmall). The drop zone is a real button (Enter/Space open the
 * picker) that also accepts dropped files; Dragover shows the 2px dashed Focus/Neutral/Subtle stroke.
 */
export function FileUpload({ label, helpText, error, type = "dropzone", text: textProp, caption, accept, multiple = false, onFilesAdd, files = [], thumbnail, onRemove, onReplace, onRetry, buttonLabel: buttonLabelProp, extended = true, className }: FileUploadProps) {
  const t = useZenLabels();
  const text = textProp === undefined ? t.dropzoneText : textProp;
  const buttonLabel = buttonLabelProp ?? t.chooseFile;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const add = (list: FileList | null) => { if (list?.length) onFilesAdd?.(Array.from(multiple ? list : [list[0]])); };
  const onDrop = (event: DragEvent<HTMLElement>) => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); };
  const open = () => inputRef.current?.click();
  const described = [helpText || error ? `${id}-help` : "", caption && extended ? `${id}-caption` : ""].filter(Boolean).join(" ") || undefined;
  // Figma File-Upload State=Uploaded, File List=Single File: a single-file field shows the File-Item in place of the
  // field; removing it brings the field back. Multiple files keep the field and list the items 16px below.
  const single = !multiple && files.length > 0;
  // Single-file field: Figma shows the file as State=Replaceable; Replace re-opens the picker unless the app handles it.
  const items = single
    ? [<UploaderFileItem key={files[0].id} file={files[0].state === "uploaded" || !files[0].state ? { ...files[0], state: "replaceable" } : files[0]} thumbnail={thumbnail} onRemove={onRemove} onReplace={onReplace ?? (() => open())} onRetry={onRetry} />]
    : files.map((file) => <UploaderFileItem key={file.id} file={file} thumbnail={thumbnail} onRemove={onRemove} onReplace={onReplace} onRetry={onRetry} />);
  return (
    <div className={["zen-file-upload", className].filter(Boolean).join(" ")} data-invalid={error ? "true" : undefined} data-files={files.length && !single ? "true" : undefined}>
      <div className="zen-file-upload__field">
      {label ? <label className={`zen-file-upload__label ${typographyStyles["Body/Small/Regular"]}`} htmlFor={single ? undefined : `${id}-trigger`} id={`${id}-label`}>{label}</label> : null}
      <input ref={inputRef} className="zen-file-upload__input" type="file" accept={accept} multiple={multiple} tabIndex={-1} aria-hidden="true" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
      {single ? <ul className="zen-file-upload__list" aria-labelledby={label ? `${id}-label` : undefined} aria-label={label ? undefined : t.file}>{items}</ul> : type === "dropzone" ? (
        <button
          id={`${id}-trigger`}
          type="button"
          className="zen-dropzone"
          data-extended={extended ? "true" : "false"}
          data-state={error ? "alert" : dragging ? "dragover" : undefined}
          aria-describedby={described}
          aria-invalid={error ? true : undefined}
          onClick={open}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Escape") setDragging(false); }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="zen-dropzone__icon"><Icon name="icon-upload-cloud-line" decorative /></span>
          <span className="zen-dropzone__content">
            <span className={`zen-dropzone__text ${typographyStyles["Body/Base/Bold"]}`}>{text}</span>
            {caption && extended ? <span id={`${id}-caption`} className={`zen-dropzone__caption ${typographyStyles["Caption/Regular"]}`}>{caption}</span> : null}
          </span>
          {/* Figma State=Dragover: 2px INSIDE stroke with dashPattern [4,4] — drawn as an SVG rect for the exact dash. */}
          {dragging && !error ? <svg className="zen-dropzone__dash" aria-hidden="true" focusable="false"><rect width="100%" height="100%" /></svg> : null}
        </button>
      ) : (
        <span className="zen-file-upload__button"><Button id={`${id}-trigger`} appearance="main" level="tertiary" size="sm" onClick={open} aria-describedby={described}>{buttonLabel}</Button></span>
      )}
      {error || helpText ? (
        <span id={`${id}-help`} className={`zen-file-upload__help ${typographyStyles["Caption/Regular"]}`} data-tone={error ? "negative" : undefined}>
          {error ? <Icon name="icon-alert-circle-line" decorative /> : null}{error ?? helpText}
        </span>
      ) : null}
      </div>
      {files.length && !single ? <ul className="zen-file-upload__list" aria-label={t.files}>{items}</ul> : null}
    </div>
  );
}
