// Bare layout for exam mode — no sidebar, no topnav, no bottomnav
// The exam takes over the entire viewport
export default function ExamLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
