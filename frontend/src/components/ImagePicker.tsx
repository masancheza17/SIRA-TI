import { AlertCircle, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_RULES,
  formatFileSize,
  validateImageFile,
} from "@/utils/attachments";

/**
 * Selector de imágenes con vista previa y opción de quitar cada una antes
 * de enviar. Es un componente controlado: el padre guarda la lista de
 * archivos (`files`) y la sube cuando corresponde (al crear el ticket, o al
 * agregar imágenes desde su detalle).
 *
 * `maxFiles` es la cantidad total que todavía se puede adjuntar (en el
 * detalle de un ticket que ya tiene imágenes, es el cupo restante).
 */
interface ImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function ImagePicker({
  files,
  onChange,
  maxFiles = ATTACHMENT_RULES.maxFiles,
  disabled = false,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isSame = (a: File, b: File) =>
    a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

  const addFiles = (incoming: FileList | File[]) => {
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(incoming)) {
      const error = validateImageFile(file);
      if (error) {
        problems.push(error);
      } else if ([...files, ...accepted].some((existing) => isSame(existing, file))) {
        // Misma imagen elegida dos veces: se ignora en silencio.
      } else if (files.length + accepted.length >= maxFiles) {
        problems.push(`Solo puedes adjuntar hasta ${maxFiles} ${maxFiles === 1 ? "imagen" : "imágenes"}.`);
        break;
      } else {
        accepted.push(file);
      }
    }

    setErrors(problems);
    if (accepted.length > 0) onChange([...files, ...accepted]);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (target: File) => {
    setErrors([]);
    onChange(files.filter((file) => file !== target));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled && event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  const isFull = files.length >= maxFiles;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isFull) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-md border-2 border-dashed px-4 py-5 text-center transition-colors ${
          isDragging ? "border-sira-primary bg-sira-primary/5" : "border-sira-soft"
        } ${disabled || isFull ? "opacity-60" : ""}`}
      >
        <ImagePlus className="mx-auto h-6 w-6 text-sira-primary" />
        <p className="mt-2 text-sm text-gray-600">
          Arrastra imágenes aquí o{" "}
          <button
            type="button"
            disabled={disabled || isFull}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-sira-primary hover:underline disabled:no-underline"
          >
            selecciónalas
          </button>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {ATTACHMENT_RULES.allowedLabel} · máx. {ATTACHMENT_RULES.maxSizeMB} MB cada una · hasta {maxFiles}{" "}
          {maxFiles === 1 ? "imagen" : "imágenes"}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          disabled={disabled || isFull}
          onChange={(event) => event.target.files && addFiles(event.target.files)}
          className="hidden"
        />
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errors.map((message) => (
            <li key={message} className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {message}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="group relative">
              <Thumb file={file} />
              <button
                type="button"
                onClick={() => removeFile(file)}
                disabled={disabled}
                aria-label={`Quitar ${file.name}`}
                className="absolute right-1 top-1 rounded-full bg-sira-dark/80 p-1 text-white hover:bg-red-600 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="mt-1 truncate text-xs text-gray-600" title={file.name}>{file.name}</p>
              <p className="text-[11px] text-gray-400">{formatFileSize(file.size)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Miniatura de un archivo local. Crea y libera su propia URL temporal; hacerlo
 * en el efecto del componente (y no al renderizar la lista) evita URLs rotas
 * con el doble montaje de React en modo desarrollo.
 */
function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="aspect-square overflow-hidden rounded-md border border-sira-soft/60 bg-gray-50">
      {url && <img src={url} alt={file.name} className="h-full w-full object-cover" />}
    </div>
  );
}
