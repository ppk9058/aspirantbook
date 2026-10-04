"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    addCourseToTrack,
    removeCourseFromTrack,
    reorderTrackCourses,
    getAvailableCourses,
} from "@/lib/actions/admin/tracks"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface TrackCourseManagerProps {
    trackId: string
    courses: any[]
}

export function TrackCourseManager({ trackId, courses: initialCourses }: TrackCourseManagerProps) {
    const [courses, setCourses] = useState(initialCourses)
    const [availableCourses, setAvailableCourses] = useState<any[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const router = useRouter()

    async function loadAvailableCourses() {
        const res = await getAvailableCourses(trackId)
        if (res.success) {
            setAvailableCourses(res.courses)
        }
    }

    async function handleAddCourse(courseId: string) {
        const res = await addCourseToTrack(trackId, courseId)
        if (res.success) {
            toast.success("Course added to track")
            setIsDialogOpen(false)
            router.refresh()
        } else {
            toast.error("Failed to add course")
        }
    }

    async function handleRemoveCourse(courseId: string) {
        if (!confirm("Are you sure you want to remove this course from the track?")) return

        const res = await removeCourseFromTrack(trackId, courseId)
        if (res.success) {
            toast.success("Course removed from track")
            router.refresh()
        } else {
            toast.error("Failed to remove course")
        }
    }

    async function onDragEnd(result: any) {
        if (!result.destination) return

        const items = Array.from(courses)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        setCourses(items)

        const updates = items.map((item, index) => ({
            id: item.id,
            order: index,
        }))

        const res = await reorderTrackCourses(trackId, updates)
        if (!res.success) {
            toast.error("Failed to save order")
            router.refresh() // Revert to server state
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={loadAvailableCourses}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Course
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Course to Track</DialogTitle>
                        </DialogHeader>
                        <Command>
                            <CommandInput placeholder="Search courses..." />
                            <CommandList>
                                <CommandEmpty>No courses found.</CommandEmpty>
                                <CommandGroup>
                                    {availableCourses.map((course) => (
                                        <CommandItem
                                            key={course.id}
                                            onSelect={() => handleAddCourse(course.id)}
                                        >
                                            {course.title}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DialogContent>
                </Dialog>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="track-courses">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                        >
                            {courses.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex items-center justify-between p-4 bg-background border rounded-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="cursor-move text-muted-foreground"
                                                >
                                                    <GripVertical className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{item.course.title}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.course.description?.substring(0, 60)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemoveCourse(item.course.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {courses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No courses assigned to this track yet.
                </div>
            )}
        </div>
    )
}
