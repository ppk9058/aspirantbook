"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge"
import { manuallyActivateSubscription, cancelUserSubscription } from "@/lib/actions/admin/users"
import { CreditCard, Calendar, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface SubscriptionManagementProps {
    userId: string
    subscriptions: any[]
}

export default function SubscriptionManagement({ userId, subscriptions }: SubscriptionManagementProps) {
    const router = useRouter()
    const [isActivating, setIsActivating] = useState(false)
    const [showActivateForm, setShowActivateForm] = useState(false)
    const [plan, setPlan] = useState<"MONTHLY" | "YEARLY">("MONTHLY")
    const [duration, setDuration] = useState(1)

    const latestSubscription = subscriptions[0]
    const isActive = latestSubscription?.status === "ACTIVE" && new Date(latestSubscription.endDate) > new Date()

    const handleActivate = async () => {
        setIsActivating(true)
        try {
            await manuallyActivateSubscription(userId, plan, duration)
            toast.success("Subscription activated successfully!")
            router.refresh()
            setShowActivateForm(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to activate subscription")
        } finally {
            setIsActivating(false)
        }
    }

    const handleCancel = async (subscriptionId: string) => {
        if (!confirm("Cancel this subscription?")) return

        try {
            await cancelUserSubscription(subscriptionId)
            toast.success("Subscription cancelled")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel subscription")
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Subscription Management</CardTitle>
                    {!isActive && !showActivateForm && (
                        <Button
                            size="sm"
                            onClick={() => setShowActivateForm(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Activate Subscription
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Subscription */}
                {latestSubscription ? (
                    <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Current Status</span>
                            <SubscriptionStatusBadge
                                status={latestSubscription.status}
                                endDate={latestSubscription.endDate}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">Plan:</span>
                                <p className="font-medium">{latestSubscription.plan}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Provider:</span>
                                <p className="font-medium">{latestSubscription.provider}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Start Date:</span>
                                <p className="font-medium">
                                    {new Date(latestSubscription.startDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-600">End Date:</span>
                                <p className="font-medium">
                                    {new Date(latestSubscription.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {isActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 hover:text-red-700"
                                onClick={() => handleCancel(latestSubscription.id)}
                            >
                                Cancel Subscription
                            </Button>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">No active subscription</p>
                )}

                {/* Manual Activation Form */}
                {showActivateForm && (
                    <div className="p-4 border-2 border-purple-200 rounded-lg space-y-3 bg-purple-50">
                        <h4 className="font-medium">Manual Subscription Activation</h4>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Plan</label>
                            <select
                                value={plan}
                                onChange={(e) => setPlan(e.target.value as any)}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Duration (months)</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowActivateForm(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                onClick={handleActivate}
                                disabled={isActivating}
                            >
                                {isActivating ? "Activating..." : "Activate"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Payment History */}
                {latestSubscription?.payments && latestSubscription.payments.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Payment History</h4>
                        <div className="space-y-2">
                            {latestSubscription.payments.slice(0, 5).map((payment: any) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between p-2 border rounded text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                        <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            ${(payment.amount / 100).toFixed(2)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${payment.status === "COMPLETED"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Subscription History */}
                {subscriptions.length > 1 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Subscription History</h4>
                        <div className="space-y-2">
                            {subscriptions.slice(1, 6).map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                    <div>
                                        <p className="font-medium">{sub.plan}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <SubscriptionStatusBadge status={sub.status} showIcon={false} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
