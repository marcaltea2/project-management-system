"use client";

import { useRef, useState } from "react";
import { Upload, MoreHorizontal, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getFileIcon } from "~/lib/helper/get-file-icon";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import JSZip from "jszip";

type Props = { projectId: string };

export function AttachmentsTab({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = api.useUtils();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: attachments = [], isLoading } = api.project.getAttachments.useQuery({ projectId });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const getDownloadUrl = api.attachments.getDownloadUrl.useMutation();
  const downloadAll = api.attachments.downloadAll.useMutation();
  
  const upload = api.attachments.upload.useMutation({
    onSuccess: () => {
      void utils.project.getAttachments.invalidate({ projectId });
      toast.success("File Uploaded");
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = api.attachments.delete.useMutation({
    onSuccess: () => {
      void utils.project.getAttachments.invalidate({ projectId });
      toast.success("Attachment Deleted");
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setDeletingId(null),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const base64 = await toBase64(file);
        window.dispatchEvent(new Event("project:saving"));
        await upload.mutateAsync({
          filename: file.name,
          fileData: base64,
          mimeType: file.type,
          folder: "projects",
          projectId,
        });
      }
    } catch {
      // errors handled in onError
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    window.dispatchEvent(new Event("project:saving"));
    remove.mutate({ id });
  };

const handleDownload = async (id: string) => {
  try {
    const { url } = await getDownloadUrl.mutateAsync({ id });
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    toast.error("Failed to download file");
  }
};

const handleDownloadAll = async () => {
  if (attachments.length === 0) return;
  setDownloadingAll(true);

  try {
    const { files } = await downloadAll.mutateAsync({ projectId });
    const zip = new JSZip();

    await Promise.all(
      files.map(async ({ filename, url }) => {
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(filename, blob);
      }),
    );

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const blobUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "attachments.zip";
    a.click();

    URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error("Failed to download files");
  } finally {
    setDownloadingAll(false);
  }
};

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upload zone */}
      <div
        className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 size={18} className="text-muted-foreground animate-spin" />
        ) : (
          <Upload size={18} className="text-muted-foreground" />
        )}
        <p className="text-muted-foreground text-sm">
          {uploading
            ? "Uploading..."
            : <>Drop files here or{" "}
                <span className="text-foreground underline underline-offset-2">browse</span>
              </>
          }
        </p>
        <p className="text-muted-foreground text-xs">PDF, images, docs up to 50MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {/* Header row */}
      {attachments.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => void handleDownloadAll()}
            disabled={downloadingAll}
          >
            {downloadingAll
              ? <Loader2 size={12} className="animate-spin" />
              : <Download size={12} />
            }
            Download all
          </Button>
        </div>
      )}

      {/* File list */}
      {attachments.length === 0 ? (
        <div className="bg-card border-border text-muted-foreground rounded-xl border p-8 text-center text-sm">
          No attachments yet
        </div>
      ) : (
        <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
          {attachments.map((f) => (
            <div
              key={f.id}
              className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="bg-muted border-border text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border">
                {getFileIcon(f.filename)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.filename}</p>
                <p className="text-muted-foreground text-xs">
                  {(f.size / 1024).toFixed(0)} KB
                </p>
              </div>

              {deletingId === f.id ? (
                <Loader2 size={14} className="text-muted-foreground animate-spin" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground h-7 w-7">
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void handleDownload(f.id)}>
                      <Download size={13} className="mr-2" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(f.id)}
                    >
                      <Trash2 size={13} className="mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Util ───────────────────────────────────────────────────────────────────────

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix (e.g. "data:image/png;base64,")
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}