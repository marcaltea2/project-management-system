"use client"

import React from "react";
import { FolderKanban } from "lucide-react";

export function ProjectEmpty() {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
          <FolderKanban className="text-muted-foreground h-7 w-7" />
        </div>
        <div className="text-center">
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground text-sm">
            Create your first project to get started
          </p>
        </div>
      </div>
    );
}
