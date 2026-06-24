"use client";

// ===== React =====
import { useState, useEffect, useRef } from "react";

// ===== Third-party =====
import { format } from "date-fns";
import {
  Loader2,
  CalendarIcon,
  X,
  Paperclip,
  UserPlus,
  Plus,
} from "lucide-react";
import { ProjectStatus, Priority } from "@prisma/client";

// ===== UI Components =====
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

// ===== API =====
import { api } from "~/trpc/react";
import { toast } from "sonner";

// ===== Lib =====
import { cn } from "~/lib/utils";
import { toBase64 } from "~/lib/to-base-64";
import { toSlug } from "~/lib/to-slug";
import {
  ALL_ATTACHMENT_ACCEPT,
  ALL_ATTACHMENT_TYPES,
} from "~/lib/constants/file-types";
import {
  PROJECT_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  COLOR_OPTIONS,
} from "~/lib/constants/project-constants";
import { getFileIcon } from "~/lib/helper/get-file-icon";
import { truncateFileName } from "~/lib/helper/truncate-filename";

// ===== Types =====
import type { ProjectListItem, ProjectAttachments, SelectedMember } from "~/types";

// ===== Internal Components =====
import { MemberCombobox } from "./workspace-member-combobox";

// ============================================================
// Types
// ============================================================

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  project?: ProjectListItem | null;
};

// ============================================================
// Component
// ============================================================

export function CreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
  project,
}: Props) {
  // ===== Setup =====
  const isEdit = !!project;
  const utils = api.useUtils();

  // ===== State: Form Fields =====
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [coverColor, setCoverColor] = useState("#6366f1");

  // ===== State: Attachments =====
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ProjectAttachments[]>(
    [],
  );
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    [],
  );

  // ===== State: Team =====
  const [members, setMembers] = useState<SelectedMember[]>([]);
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false);

  // ===== Queries =====
  const { data: workspaceMembers } = api.workspace.getMembers.useQuery(
    { workspaceId },
    { enabled: open },
  );

  // ===== Mutations =====
  const uploadFile = api.attachments.upload.useMutation();
  const deleteAttachment = api.attachments.delete.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const createProject = api.project.create.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const updateProject = api.project.update.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const isPending =
    createProject.isPending ||
    updateProject.isPending ||
    uploadFile.isPending ||
    deleteAttachment.isPending;

  // ===== Effects =====
  useEffect(() => {
    if (project && open) {
      setName(project.name);
      setDescription(project.description ?? "");
      setStatus(project.status);
      setPriority(project.priority);
      setDueDate(project.dueDate ?? undefined);
      setCoverColor(project.coverColor ?? "#6366f1");
      setMembers(
        project.members.map((m) => ({
          id: m.userId,
          name: m.user?.name ?? null,
          image: m.user?.image ?? null,
          email: m.user?.email ?? null,
        })),
      );
      setExistingAttachments(project.attachments ?? []);
    }
  }, [project, open]);

  // ===== Handlers: Files =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (!ALL_ATTACHMENT_TYPES.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type.`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10MB.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemoveNewFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleRemoveExistingFile = (id: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
    setRemovedAttachmentIds((prev) => [...prev, id]);
  };

  // ===== Handlers: Members =====
  const handleAddMember = (member: SelectedMember) => {
    setMembers((prev) => [...prev, member]);
    setMemberPopoverOpen(false);
  };

  const handleRemoveMember = (index: number) =>
    setMembers((prev) => prev.filter((_, i) => i !== index));

  // ===== Handlers: Form =====
  const handleClose = () => {
    setName("");
    setDescription("");
    setStatus(ProjectStatus.ACTIVE);
    setPriority(Priority.MEDIUM);
    setDueDate(undefined);
    setCoverColor("#6366f1");
    setFiles([]);
    setMembers([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
    setMemberPopoverOpen(false);
    onOpenChange(false);
  };

  // ===== Handlers: Submit Helpers =====
  const saveProject = async () => {
    if (isEdit && project) {
      return updateProject.mutateAsync({
        id: project.id,
        name,
        slug: toSlug(name),
        description,
        status,
        priority,
        dueDate,
        coverColor,
      });
    }

    return createProject.mutateAsync({
      workspaceId,
      name,
      slug: toSlug(name),
      description,
      status,
      priority,
      dueDate,
      coverColor,
      members: members.map((m) => m.id),
    }); 
  };

  const syncAttachments = async (projectId: string) => {
    // Delete removed attachments from R2 + DB
    for (const id of removedAttachmentIds) {
      await deleteAttachment.mutateAsync({ id });
    }

    // Upload new attachments
    for (const file of files) {
      const base64 = await toBase64(file);
      await uploadFile.mutateAsync({
        filename: file.name,
        fileData: base64,
        mimeType: file.type,
        folder: "projects",
        projectId,
      });
    }
  };

  // ===== Handlers: Main Submit =====
  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      const result = await saveProject();
      await syncAttachments(result.id);
      await utils.project.invalidate();

      handleClose();
      toast.success(isEdit ? "Project updated!" : "Project created!");
    } catch (err) {
      toast.error("Something went wrong.");
      console.error(err);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{ borderTop: `5px solid ${coverColor}` }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your project details."
              : "Create a new project for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {/* Name */}
          <div className="grid items-center gap-4 md:grid-cols-[140px_1fr]">
            <Label>Name</Label>
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="grid items-start gap-4 md:grid-cols-[140px_1fr]">
            <Label className="pt-2">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Attachments */}
          <div className="grid items-start gap-4 md:grid-cols-[140px_1fr]">
            <Label className="pt-2">
              Attachments{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="space-y-2">
              {/* Existing files */}
              {existingAttachments.map((a) => (
                <div
                  key={a.id}
                  className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <div className="dark:bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
                    {getFileIcon(a.filename)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {truncateFileName(a.filename)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(a.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleRemoveExistingFile(a.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* New files */}
              {files.map((f, i) => (
                <div
                  key={i}
                  className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <div className="dark:bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
                    {getFileIcon(f.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {truncateFileName(f.name)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(f.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleRemoveNewFile(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => inputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Attach file
              </Button>
              <p className="text-muted-foreground text-xs">
                PDF, Word, Excel, images up to 10MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ALL_ATTACHMENT_ACCEPT}
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Team */}
          <div className="grid items-start gap-4 md:grid-cols-[140px_1fr]">
            <Label className="pt-2">Team</Label>
            <div className="space-y-2">
              {/* Member pills */}
              {members.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m, i) => (
                    <div
                      key={i}
                      className="bg-muted flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.image ?? ""} />
                        <AvatarFallback className="text-[8px]">
                          {m.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(i)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button */}
                  <Popover
                    open={memberPopoverOpen}
                    onOpenChange={setMemberPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="bg-muted hover:bg-accent flex h-7 w-7 items-center justify-center rounded-full border"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <MemberCombobox
                        workspaceMembers={workspaceMembers ?? []}
                        selectedIds={members.map((m) => m.id)}
                        onSelect={handleAddMember}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Empty state — show add button */}
              {members.length === 0 && (
                <Popover
                  open={memberPopoverOpen}
                  onOpenChange={setMemberPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add team members
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <MemberCombobox
                      workspaceMembers={workspaceMembers ?? []}
                      selectedIds={members.map((m) => m.id)}
                      onSelect={handleAddMember}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="grid items-center gap-4 md:grid-cols-[140px_1fr]">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProjectStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="grid items-center gap-4 md:grid-cols-[140px_1fr]">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as Priority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="grid items-center gap-4 md:grid-cols-[140px_1fr]">
            <Label>
              Due Date{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cover Color */}
          <div className="mb-2 grid items-start gap-4 md:grid-cols-[140px_1fr]">
            <Label className="pt-1">Cover Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => setCoverColor(color.value)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all",
                    coverColor === color.value
                      ? "ring-offset-background scale-110 ring-2 ring-offset-2"
                      : "opacity-70 hover:opacity-100",
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={handleSubmit}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
