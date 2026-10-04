import { getCareerTracks } from "@/lib/actions/tracks/career"
import CareerTracksClient from "./CareerTracksClient"
import BackButton from "@/components/layout/BackButton"

export default async function CareerTracksPage({
    searchParams,
}: {
    searchParams: Promise<{ role?: string }>
}) {
    const resolvedParams = await searchParams
    const roleFilter = resolvedParams?.role || "All"
    const tracks = await getCareerTracks(roleFilter === "All" ? undefined : roleFilter)

    return (
        <div className="space-y-6">
            <BackButton fallbackUrl="/" />

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#05192D] to-[#0a2540] rounded-2xl p-12 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <h1 className="text-4xl font-bold">Career tracks</h1>
                        <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                            ✓ Zero to job ready
                        </span>
                    </div>
                    <p className="text-lg text-gray-300 max-w-2xl">
                        Our career tracks are hand-picked by industry experts. You will learn all you need to start a new career in the data science field.
                    </p>
                </div>

                {/* Decorative Icon */}
                <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-20">
                    <div className="relative">
                        <div className="w-32 h-32 bg-green-500 rounded-lg transform rotate-12"></div>
                        <div className="w-32 h-32 bg-green-400 rounded-lg transform -rotate-6 absolute top-4 left-4"></div>
                        <div className="w-32 h-32 bg-green-300 rounded-lg transform rotate-3 absolute top-8 left-8"></div>
                    </div>
                </div>
            </div>

            <CareerTracksClient tracks={tracks} initialRole={roleFilter} />
        </div>
    )
}
