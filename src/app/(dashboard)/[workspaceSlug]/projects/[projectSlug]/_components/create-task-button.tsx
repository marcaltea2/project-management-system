"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CreateTaskDialog } from "./create-task-dialog";

type Props = {
  projectId: string;
};

export function CreateTaskButton({ projectId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
      >
        <Plus size={13} /> New task
      </Button>
      <CreateTaskDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
      />
    </>
  );
}