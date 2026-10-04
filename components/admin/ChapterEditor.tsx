"use client"

import React from "react"
import { Chapter } from "@prisma/client"
import { createChapter, updateChapter, deleteChapter } from "@/lib/actions/admin/chapters"
import { UniversalEditor } from "@/components/editor/UniversalEditor"

interface ChapterEditorProps {
    courseId: string
    chapter?: Chapter
    onClose: () => void
    onSaved: () => void
}

export function ChapterEditor({ courseId, chapter, onClose, onSaved }: ChapterEditorProps) {
    const handleSave = async (data: any) => {
        if (chapter) {
            await updateChapter(chapter.id, { title: data.title, description: data.description })
        } else {
            await createChapter(courseId, { title: data.title, description: data.description })
        }
        onSaved()
        onClose()
    }

    const handleDelete = async () => {
        if (!chapter) return
        await deleteChapter(chapter.id)
        onSaved()
        onClose()
    }

    return (
        <UniversalEditor
            mode={chapter ? "edit" : "create"}
            entityType="chapter"
            entityId={chapter?.id}
            parentId={courseId}
            initialData={{
                title: chapter?.title || "",
                description: chapter?.description || "",
            }}
            permissions={{
                canEdit: true,
                canPublish: true,
                canDelete: !!chapter,
            }}
            onSave={handleSave}
            onCancel={onClose}
            onDelete={chapter ? handleDelete : undefined}
        />
    )
}
