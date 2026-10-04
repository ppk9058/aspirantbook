import { Badge } from "@/components/ui/badge"
import { Shield, Crown, User, School } from "lucide-react"

type UserRole = "ADMIN" | "TEACHER" | "PREMIUM" | "FREE"

interface UserRoleBadgeProps {
    role: UserRole
    showIcon?: boolean
}

export default function UserRoleBadge({ role, showIcon = true }: UserRoleBadgeProps) {
    const config: Record<UserRole, { label: string; className: string; icon: typeof Shield }> = {
        ADMIN: {
            label: "Admin",
            className: "bg-purple-600 text-white hover:bg-purple-700",
            icon: Shield,
        },
        TEACHER: {
            label: "Teacher",
            className: "bg-indigo-600 text-white hover:bg-indigo-700",
            icon: School,
        },
        PREMIUM: {
            label: "Premium",
            className: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600",
            icon: Crown,
        },
        FREE: {
            label: "Free",
            className: "bg-gray-500 text-white hover:bg-gray-600",
            icon: User,
        },
    }

    const { label, className, icon: Icon } = config[role] || config.FREE

    return (
        <Badge className={className}>
            {showIcon && <Icon className="h-3 w-3 mr-1" />}
            {label}
        </Badge>
    )
}
