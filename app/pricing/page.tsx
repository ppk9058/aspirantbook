import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Crown } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function PricingPage() {
    const session = await auth()
    const user = session?.user

    // If user is already premium, redirect to subscription page
    if (user?.subscriptionStatus === "ACTIVE") {
        redirect("/subscription")
    }

    const plans = [
        {
            name: "FREE",
            price: "₹0",
            priceUSD: "$0",
            period: "forever",
            description: "Perfect for getting started",
            features: [
                "Access to free courses",
                "Basic coding exercises",
                "Community support",
                "Limited assessments",
            ],
            limitations: [
                "No premium courses",
                "No certificates",
                "No priority support",
            ],
            buttonText: user ? "Current Plan" : "Sign Up Free",
            buttonLink: user ? "/dashboard" : "/register",
            variant: "outline" as const,
        },
        {
            name: "PREMIUM",
            price: "₹499",
            priceUSD: "$19",
            period: "per month",
            description: "Everything you need to master coding",
            features: [
                "Access to all courses",
                "Unlimited coding exercises",
                "All assessments and tutorials",
                "Course completion certificates",
                "Priority support",
                "Downloadable resources",
                "Ad-free experience",
                "Early access to new content",
            ],
            limitations: [],
            buttonText: "Upgrade to Premium",
            buttonLink: "/checkout?plan=monthly",
            variant: "default" as const,
        },
    ]

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Start for free, upgrade when you're ready. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative ${plan.name === "PREMIUM" ? "border-purple-500 border-2 shadow-xl" : "shadow-md"}`}
                        >
                            {plan.name === "PREMIUM" && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-purple-600 text-white px-4 py-1 text-sm">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pt-8">
                                <CardTitle>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</div>
                                    <div className="flex items-baseline justify-center gap-1 mb-2">
                                        <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                                        <span className="text-gray-600">{plan.period}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-normal">
                                        {plan.description}
                                    </p>
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                                    <Check className="h-3 w-3 text-green-600" />
                                                </div>
                                                <span className="text-gray-700">{feature}</span>
                                            </div>
                                        ))}
                                        {plan.limitations.map((limitation, index) => (
                                            <div key={index} className="flex items-start gap-3 opacity-50">
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                                                    <X className="h-3 w-3 text-red-600" />
                                                </div>
                                                <span className="text-gray-700">{limitation}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Link href={plan.buttonLink} className="block">
                                        <Button
                                            className={`w-full h-12 text-lg ${plan.name === "PREMIUM"
                                                    ? "bg-purple-600 hover:bg-purple-700"
                                                    : ""
                                                }`}
                                            variant={plan.variant}
                                            disabled={plan.name === "FREE" && !!user}
                                        >
                                            {plan.name === "PREMIUM" && <Crown className="mr-2 h-5 w-5" />}
                                            {plan.buttonText}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-600">
                        Have questions? <Link href="/contact" className="text-purple-600 hover:underline">Contact our support team</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
