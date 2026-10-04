import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CreditCard, Download } from "lucide-react"
import Link from "next/link"

export default async function SubscriptionPage() {
    const session = await auth()

    if (!session?.user?.email) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            subscriptions: {
                where: {
                    status: {
                        in: ["ACTIVE", "PAST_DUE"],
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 1,
            },
            payments: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 10,
            },
        },
    })

    if (!user) {
        redirect("/login")
    }

    const activeSubscription = user.subscriptions[0]

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
                <p className="text-muted-foreground">
                    Manage your subscription and billing
                </p>
            </div>

            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your active subscription details</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeSubscription ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold">{activeSubscription.plan}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {activeSubscription.plan === "MONTHLY" ? "$19/month" : "$190/year"}
                                    </p>
                                </div>
                                <Badge variant={activeSubscription.status === "ACTIVE" ? "default" : "destructive"}>
                                    {activeSubscription.status}
                                </Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Next billing date</p>
                                        <p className="text-muted-foreground">
                                            {new Date(activeSubscription.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Payment method</p>
                                        <p className="text-muted-foreground">
                                            {activeSubscription.provider}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Link href="/pricing">
                                    <Button variant="outline">Change Plan</Button>
                                </Link>
                                <Button variant="destructive" disabled>
                                    Cancel Subscription
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                            <p className="text-muted-foreground mb-4">
                                You're currently on the free plan
                            </p>
                            <Link href="/pricing">
                                <Button>Upgrade to Premium</Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your recent transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    {user.payments.length > 0 ? (
                        <div className="space-y-4">
                            {user.payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between py-3 border-b last:border-0"
                                >
                                    <div>
                                        <p className="font-medium">
                                            ${payment.amount.toFixed(2)} {payment.currency}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                payment.status === "COMPLETED"
                                                    ? "default"
                                                    : payment.status === "FAILED"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {payment.status}
                                        </Badge>
                                        {payment.metadata && (payment.metadata as any).invoiceUrl && (
                                            <Button variant="ghost" size="icon" asChild>
                                                <a
                                                    href={(payment.metadata as any).invoiceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            No payment history yet
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
