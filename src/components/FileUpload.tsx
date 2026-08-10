import {
  useRef,
  useState,
} from 'react';

import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
} from 'lucide-react';

import {
  uploadPrivateFile,
} from '../services/db';

interface FileUploadProps {
  bucket: string;
  pathPrefix: string;
  accept?: string;
  onUploaded: (
    path: string,
    file: File
  ) => void;
}

export function FileUpload({
  bucket,
  pathPrefix,
  accept,
  onUploaded,
}: FileUploadProps) {
  const ref =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState('');

  const choose = async (
    selected?: File
  ) => {
    if (!selected) return;

    setError('');
    setProgress(0);

    if (
      selected.size >
      100 * 1024 * 1024
    ) {
      setError(
        'File exceeds 100 MB.'
      );
      return;
    }

    setFile(selected);

    try {
      const safeName =
        selected.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

      const path =
        `${pathPrefix}/${crypto.randomUUID()}-${safeName}`;

      await uploadPrivateFile(
        bucket,
        path,
        selected,
        setProgress
      );

      onUploaded(
        path,
        selected
      );
    } catch (e: any) {
      setError(
        e?.message ||
          'Upload failed.'
      );

      setFile(null);
      setProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setError('');

    if (ref.current) {
      ref.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={ref}
        hidden
        type="file"
        accept={accept}
        onChange={(e) =>
          choose(
            e.target.files?.[0]
          )
        }
      />

      {!file ? (
        <button
          type="button"
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 hover:bg-slate-100 transition"
          onClick={() =>
            ref.current?.click()
          }
        >
          <UploadCloud
            size={32}
            className="mx-auto mb-3 text-slate-400"
          />

          <div className="font-medium">
            Drop a file here or browse
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Private storage • max 100 MB
          </div>
        </button>
      ) : (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <FileText
              size={24}
              className="text-slate-500 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {file.name}
              </div>

              <div className="text-xs text-slate-500">
                {formatFileSize(
                  file.size
                )}
              </div>
            </div>

            {progress === 100 && (
              <CheckCircle2
                size={20}
                className="text-green-600"
              />
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={clearFile}
            >
              <X size={17} />
            </button>
          </div>

          {progress > 0 &&
            progress < 100 && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-900 transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Uploading {progress}%
                </div>
              </div>
            )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function formatFileSize(
  bytes: number
) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = [
    'Bytes',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(1)} ${
    units[index]
  }`;
}