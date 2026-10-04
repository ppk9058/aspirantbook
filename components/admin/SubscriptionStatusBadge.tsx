import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react"

type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING"

interface SubscriptionStatusBadgeProps {
    status: SubscriptionStatus
    endDate?: Date
    showIcon?: boolean
}

export default function SubscriptionStatusBadge({
    status,
    endDate,
    showIcon = true
}: SubscriptionStatusBadgeProps) {
    const config = {
        ACTIVE: {
            label: "Active",
            className: "bg-green-600 text-white hover:bg-green-700",
            icon: CheckCircle,
        },
        EXPIRED: {
            label: "Expired",
            className: "bg-red-600 text-white hover:bg-red-700",
            icon: XCircle,
        },
        CANCELLED: {
            label: "Cancelled",
            className: "bg-orange-600 text-white hover:bg-orange-700",
            icon: AlertCircle,
        },
        PENDING: {
            label: "Pending",
            className: "bg-blue-600 text-white hover:bg-blue-700",
            icon: Clock,
        },
    }

    const { label, className, icon: Icon } = config[status]

    const title = endDate
        ? `${label} - Expires: ${endDate.toLocaleDateString()}`
        : label

    return (
        <Badge className={className} title={title}>
            {showIcon && <Icon className="h-3 w-3 mr-1" />}
            {label}
        </Badge>
    )
}
