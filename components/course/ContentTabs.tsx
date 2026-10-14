"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileDown, Clock, MessageSquare, Book } from "lucide-react"

interface Tab {
    id: string
    label: string
    icon: any
}

interface ContentTabsProps {
    courseData: {
        description: string
        objectives: string[]
        prerequisites: string[]
        instructor: {
            name: string
            title: string
            bio: string
            avatar?: string
        }
    }
    resources?: Array<{
        id: string
        name: string
        type: string
        size: string
        url: string
    }>
    notes?: Array<{
        id: string
        timestamp: number
        content: string
        createdAt: Date
    }>
    discussions?: Array<{
        id: string
        title: string
        author: string
        timestamp: Date
        upvotes: number
        replies: number
    }>
}

const TABS: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'resources', label: 'Resources', icon: FileDown },
    { id: 'notes', label: 'Notes', icon: Clock },
    { id: 'discussion', label: 'Discussion', icon: MessageSquare }
]

export default function ContentTabs({
    courseData,
    resources = [],
    notes = [],
    discussions = []
}: ContentTabsProps) {
    const [activeTab, setActiveTab] = useState('overview')

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <div className="flex px-6">
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-[#1448d8]'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}

                                {activeTab === tab.id && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1448d8]"
                                        layoutId="activeTabIndicator"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 min-h-[400px]">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Course Description */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">About this lesson</h3>
                            <p className="text-gray-700 leading-relaxed">{courseData.description}</p>
                        </div>

                        {/* Learning Objectives */}
                        {courseData.objectives.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Learning Objectives</h3>
                                <ul className="space-y-2">
                                    {courseData.objectives.map((objective, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1448d8] flex-shrink-0" />
                                            <span className="text-gray-700">{objective}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {courseData.prerequisites.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Prerequisites</h3>
                                <ul className="space-y-2">
                                    {courseData.prerequisites.map((prerequisite, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                            <span className="text-gray-700">{prerequisite}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Instructor Card */}
                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Instructor</h3>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                    {courseData.instructor.avatar ? (
                                        <img
                                            src={courseData.instructor.avatar}
                                            alt={courseData.instructor.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        courseData.instructor.name.charAt(0)
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{courseData.instructor.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{courseData.instructor.title}</p>
                                    <p className="text-sm text-gray-700">{courseData.instructor.bio}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resources Tab */}
                {activeTab === 'resources' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Downloadable Resources</h3>
                        {resources.length > 0 ? (
                            <div className="space-y-3">
                                {resources.map((resource) => (
                                    <div
                                        key={resource.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileDown className="h-5 w-5 text-gray-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">{resource.name}</p>
                                                <p className="text-sm text-gray-600">{resource.type} • {resource.size}</p>
                                            </div>
                                        </div>
                                        <button type="button" className="px-4 py-2 bg-[#1448d8] text-white text-sm font-semibold rounded-lg hover:bg-[#0f37a8] transition-colors">
                                            Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No resources available for this lesson
                            </div>
                        )}
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">My Notes</h3>
                            <button type="button" className="px-4 py-2 bg-[#1448d8] text-white text-sm font-semibold rounded-lg hover:bg-[#0f37a8] transition-colors">
                                + Add Note
                            </button>
                        </div>

                        {notes.length > 0 ? (
                            <div className="space-y-4">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <button type="button" className="px-2 py-1 bg-[#1448d8] text-white text-xs font-mono rounded font-semibold hover:bg-[#0f37a8] transition-colors">
                                                {formatTime(note.timestamp)}
                                            </button>
                                            <span className="text-xs text-gray-500">
                                                {note.createdAt.toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-700">{note.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p>No notes yet. Add notes with timestamps while watching!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Discussion Tab */}
                {activeTab === 'discussion' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Q&A</h3>
                            <button type="button" className="px-4 py-2 bg-[#1448d8] text-white text-sm font-semibold rounded-lg hover:bg-[#0f37a8] transition-colors">
                                Ask Question
                            </button>
                        </div>

                        {discussions.length > 0 ? (
                            <div className="space-y-4">
                                {discussions.map((discussion) => (
                                    <div
                                        key={discussion.id}
                                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                                    >
                                        <h4 className="font-semibold text-gray-900 mb-2">{discussion.title}</h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span>{discussion.author}</span>
                                            <span>•</span>
                                            <span>{discussion.timestamp.toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <span>↑</span> {discussion.upvotes}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                {discussion.replies}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p>No questions yet. Be the first to ask!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
