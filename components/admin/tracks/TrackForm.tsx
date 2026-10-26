"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { createTrack, updateTrack } from "@/lib/actions/admin/tracks"
import { Track } from "@prisma/client"

const formSchema = z.object({
    title: z.string().min(3, {
        message: "Title must be at least 3 characters.",
    }),
    description: z.string().min(10, {
        message: "Description must be at least 10 characters.",
    }),
    type: z.enum(["CAREER", "SKILL"]),
    // B-026: no `.default()` here. A defaulted field makes the resolver's input
    // type optional while the form value type is required, which broke every
    // <FormField control> prop. defaultValues below supplies the initial value.
    isPublished: z.boolean(),
})

interface TrackFormProps {
    initialData?: Track
}

export function TrackForm({ initialData }: TrackFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            type: initialData?.type || "CAREER",
            isPublished: initialData?.isPublished || false,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsLoading(true)

            if (initialData) {
                const res = await updateTrack(initialData.id, values)
                if (res.success) {
                    toast.success("Track updated successfully")
                    router.refresh()
                } else {
                    toast.error(res.error || "Something went wrong")
                }
            } else {
                const res = await createTrack(values)
                if (res.success) {
                    toast.success("Track created successfully")
                    router.push(`/admin/tracks/${res.track?.id}`)
                } else {
                    toast.error(res.error || "Something went wrong")
                }
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Frontend Developer" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This is the public display name of the track.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a track type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="CAREER">Career Track</SelectItem>
                                        <SelectItem value="SKILL">Skill Track</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Career tracks are comprehensive paths. Skill tracks focus on specific technologies.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what students will learn in this track..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Published</FormLabel>
                                <FormDescription>
                                    Make this track visible to students.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex items-center gap-x-2">
                    <Button type="submit" disabled={isLoading}>
                        {initialData ? "Save Changes" : "Create Track"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
