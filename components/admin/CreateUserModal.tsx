"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createNewUserAdmin } from "@/lib/actions/admin/users"
import { UserPlus, X, Loader2 } from "lucide-react"

export default function CreateUserModal() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<"FREE" | "PREMIUM" | "TEACHER" | "ADMIN">("FREE")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        startTransition(async () => {
            try {
                await createNewUserAdmin({
                    name,
                    email,
                    password: password || undefined,
                    role,
                    phoneNumber: phoneNumber || undefined,
                })

                setSuccess("User created successfully!")
                setName("")
                setEmail("")
                setPassword("")
                setPhoneNumber("")
                router.refresh()
                setTimeout(() => {
                    setIsOpen(false)
                    setSuccess("")
                }, 1200)
            } catch (err: any) {
                setError(err.message || "Failed to create user")
            }
        })
    }

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
                <UserPlus className="h-4 w-4" />
                Create User
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-1">Create New User</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Provision a new account with customized role and credentials.
                        </p>

                        {error && (
                            <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm font-medium">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Initial Password (optional, min 8 chars)
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave empty for auto-generated secure password"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="FREE">Free</option>
                                    <option value="PREMIUM">Premium</option>
                                    <option value="TEACHER">Teacher</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Phone Number (optional)
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. +919876543210"
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Create Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
