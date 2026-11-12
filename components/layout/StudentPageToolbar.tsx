import type { ReactNode } from "react"

interface StudentPageToolbarProps {
    /** Optional: pages without a tab row (e.g. /courses) omit it entirely. */
    tabs?: ReactNode
    search?: ReactNode
    chips?: ReactNode
}

export default function StudentPageToolbar({
    tabs,
    search,
    chips,
}: StudentPageToolbarProps) {
    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
                {tabs ? <div className="min-w-0 flex-1 sm:flex-none">{tabs}</div> : null}
                {search ? (
                    <div className="w-full min-w-0 sm:ml-auto sm:w-auto sm:max-w-xs">
                        {search}
                    </div>
                ) : null}
            </div>
            {chips ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {chips}
                </div>
            ) : null}
        </div>
    )
}
