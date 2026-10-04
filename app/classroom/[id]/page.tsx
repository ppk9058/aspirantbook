import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getClassroomData } from "@/lib/classroom-service"
import { getAllBatches } from "@/lib/batches-service"
import LiveClassroomClient from "@/components/classroom/LiveClassroomClient"

interface ClassroomPageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const batches = await getAllBatches()
  return batches.map((b) => ({ id: b.slug }))
}

export async function generateMetadata({ params }: ClassroomPageProps): Promise<Metadata> {
  const { id } = await params
  const classroom = await getClassroomData(id)
  return {
    title: `🔴 LIVE: ${classroom.topicTitle} - ${classroom.batchTitle} | aspirantbook PW`,
    description: `Join live interactive masterclass with ${classroom.teacher.name}. Watch teacher, take notes, participate in live polls & DPP.`,
  }
}

import { auth } from "@/auth"

export default async function ClassroomPage({ params }: ClassroomPageProps) {
  const { id } = await params
  const classroom = await getClassroomData(id)

  if (!classroom) {
    notFound()
  }

  const session = await auth()
  const isTeacher = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
  const userRole: "student" | "teacher" = isTeacher ? "teacher" : "student"

  return (
    <LiveClassroomClient
      initialClassroom={classroom}
      userRole={userRole}
      user={session?.user || null}
    />
  )
}
