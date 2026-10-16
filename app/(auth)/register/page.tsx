import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"
import { Sparkles } from "lucide-react"

export default async function RegisterPage({
    searchParams,
}: {
    searchParams?: Promise<{ callbackUrl?: string }>
}) {
    const params = searchParams ? await searchParams : {}
    const callbackUrl = params.callbackUrl

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                    <p className="text-gray-600 mt-2">Join thousands of learners mastering new skills</p>
                </div>

                <RegisterForm />

                <div className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                        href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
                        className="text-green-600 font-medium hover:underline"
                    >
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    )
}
