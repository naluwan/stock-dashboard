'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  /** 是否為 table row 模式（用 tr 包裝） */
  asTableRow?: boolean;
}

export default function SortableItem({ id, children, asTableRow }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (asTableRow) {
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'bg-emerald-50 shadow-lg dark:bg-emerald-900/20' : ''}`}
      >
        <td className="w-8 px-1 py-3 sm:px-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="拖拉排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
        {children}
      </tr>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-lg ring-2 ring-emerald-400/50' : ''}`}
    >
      <div className="flex items-start gap-1">
        <button
          {...attributes}
          {...listeners}
          className="mt-3 shrink-0 cursor-grab touch-none rounded p-0.5 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
          aria-label="拖拉排序"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
