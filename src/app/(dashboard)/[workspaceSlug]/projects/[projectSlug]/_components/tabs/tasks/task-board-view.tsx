"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { rectIntersection } from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./task-kanban-column";
import { DragOverlayCard } from "./task-card";
import { COLUMNS } from "~/lib/constants/task-constants";
import type { TaskListItem } from "~/types";

const kanbanCollision: CollisionDetection = (args) => {
  const columnCollisions = rectIntersection({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) =>
      COLUMNS.some((col) => col.id === c.id),
    ),
  });
  if (columnCollisions.length > 0) return columnCollisions;
  return rectIntersection(args);
};

export function BoardView({
  tasks,
  onDragStart,
  onDragOver,
  onDragEnd,
  activeTask,
  onEdit,
  onDelete,
}: {
  tasks: TaskListItem[];
  onDragStart: (e: DragStartEvent) => void;
  onDragOver: (e: DragOverEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  activeTask: TaskListItem | null;
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}