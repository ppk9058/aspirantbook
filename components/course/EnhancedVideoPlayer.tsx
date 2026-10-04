"use client"

import { useRef, useState, useEffect } from "react"
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Settings,
    PictureInPicture,
    SkipBack,
    SkipForward
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface EnhancedVideoPlayerProps {
    videoUrl?: string
    title: string
    onProgress?: (progress: number) => void
    onComplete?: () => void
    initialProgress?: number
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const QUALITIES = ['Auto', '1080p', '720p', '480p', '360p']

export default function EnhancedVideoPlayer({
    videoUrl,
    title,
    onProgress,
    onComplete,
    initialProgress = 0
}: EnhancedVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Video state
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [quality, setQuality] = useState('Auto')
    const [showSpeedMenu, setShowSpeedMenu] = useState(false)
    const [showQualityMenu, setShowQualityMenu] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)

    let controlsTimeout: NodeJS.Timeout

    // Initialize video
    useEffect(() => {
        if (videoRef.current && initialProgress > 0) {
            videoRef.current.currentTime = initialProgress
        }
    }, [initialProgress])

    // Handle play/pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    // Handle volume
    const handleVolumeChange = (newVolume: number) => {
        if (videoRef.current) {
            videoRef.current.volume = newVolume
            setVolume(newVolume)
            setIsMuted(newVolume === 0)
        }
    }

    const toggleMute = () => {
        if (videoRef.current) {
            const newMuted = !isMuted
            videoRef.current.muted = newMuted
            setIsMuted(newMuted)
        }
    }

    // Handle seek
    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
            setCurrentTime(time)
        }
    }

    // Handle playback speed
    const changeSpeed = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
            setPlaybackSpeed(speed)
            setShowSpeedMenu(false)
        }
    }

    // Handle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    // Handle Picture-in-Picture
    const togglePiP = async () => {
        if (videoRef.current) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture()
                } else {
                    await videoRef.current.requestPictureInPicture()
                }
            } catch (error) {
                console.error('PiP error:', error)
            }
        }
    }

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'arrowright':
                    skip(10)
                    break
                case 'arrowleft':
                    skip(-10)
                    break
                case 'arrowup':
                    e.preventDefault()
                    handleVolumeChange(Math.min(1, volume + 0.1))
                    break
                case 'arrowdown':
                    e.preventDefault()
                    handleVolumeChange(Math.max(0, volume - 0.1))
                    break
                case 'm':
                    toggleMute()
                    break
                case 'f':
                    toggleFullscreen()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [isPlaying, volume])

    // Auto-hide controls
    const triggerControls = () => {
        setShowControls(true)
        clearTimeout(controlsTimeout)
        controlsTimeout = setTimeout(() => {
            if (isPlaying) setShowControls(false)
        }, 3500)
    }

    const handleMouseMove = () => {
        triggerControls()
    }

    const handleTouchInteraction = () => {
        if (!showControls) {
            triggerControls()
        } else {
            // If already shown, tapping toggles or resets timer
            triggerControls()
        }
    }

    // Video event handlers
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime
            setCurrentTime(current)

            // Call onProgress every 5 seconds
            if (onProgress && Math.floor(current) % 5 === 0) {
                onProgress(current)
            }

            // Check if 90% complete
            if (onComplete && duration > 0 && current / duration >= 0.9) {
                onComplete()
            }
        }
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration)
        }
    }

    const handleWaiting = () => setIsBuffering(true)
    const handlePlaying = () => setIsBuffering(false)

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group select-none touch-manipulation"
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchInteraction}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                webkit-playsinline="true"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                onClick={togglePlay}
            >
                {videoUrl && <source src={videoUrl} type="video/mp4" />}
            </video>

            {/* Placeholder for demo (only if no video URL) */}
            {!videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-green-500 z-0">
                    <div className="text-white text-center">
                        <h2 className="text-4xl font-black mb-2">{title}</h2>
                        <p className="text-lg">Video Content Here</p>
                    </div>
                </div>
            )}

            {/* Buffering Spinner */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Center Play Button */}
            {!isPlaying && showControls && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 m-auto w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                    onClick={togglePlay}
                >
                    <Play className="h-10 w-10 text-white fill-white ml-1" />
                </motion.button>
            )}

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 sm:pt-20 pb-3 sm:pb-4 px-3 sm:px-4"
                    >
                        {/* Progress Bar */}
                        <div className="mb-2 sm:mb-4 px-1">
                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                                className="w-full h-2 sm:h-1.5 py-2 -my-2 bg-white/30 rounded-full appearance-none cursor-pointer touch-none
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3AAFA9]
                  [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-[#3AAFA9] [&::-moz-range-thumb]:border-0"
                                style={{
                                    background: `linear-gradient(to right, #3AAFA9 0%, #3AAFA9 ${progress}%, rgba(255,255,255,0.3) ${progress}%, rgba(255,255,255,0.3) 100%)`
                                }}
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between text-white gap-2 sm:gap-4">
                            {/* Left Controls */}
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                <button onClick={togglePlay} className="p-1 sm:p-0 hover:text-[#3AAFA9] transition-colors active:scale-90" aria-label={isPlaying ? "Pause" : "Play"}>
                                    {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />}
                                </button>

                                <button onClick={() => skip(-10)} className="p-1 sm:p-0 hover:text-[#3AAFA9] transition-colors active:scale-90" aria-label="Rewind 10 seconds">
                                    <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>

                                <button onClick={() => skip(10)} className="p-1 sm:p-0 hover:text-[#3AAFA9] transition-colors active:scale-90" aria-label="Forward 10 seconds">
                                    <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>

                                {/* Volume (hidden on small phones, where physical buttons are standard) */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <button onClick={toggleMute} className="hover:text-[#3AAFA9] transition-colors" aria-label="Toggle mute">
                                        {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                    </button>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                        className="w-16 sm:w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                                    />
                                </div>

                                {/* Time */}
                                <span className="text-xs sm:text-sm font-mono truncate">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                {/* Speed Control */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                        className="text-xs sm:text-sm font-semibold hover:text-[#3AAFA9] transition-colors px-1 sm:px-1.5 py-0.5 rounded bg-white/10 sm:bg-transparent"
                                        aria-label="Playback speed"
                                    >
                                        {playbackSpeed}x
                                    </button>
                                    {showSpeedMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-sm rounded-lg py-2 min-w-[80px] shadow-xl border border-gray-800 z-30">
                                            {PLAYBACK_SPEEDS.map(speed => (
                                                <button
                                                    key={speed}
                                                    onClick={() => changeSpeed(speed)}
                                                    className={`block w-full px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-800 transition-colors ${speed === playbackSpeed ? 'text-[#3AAFA9] font-bold' : ''
                                                        }`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quality */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                                        className="p-1 sm:p-0 hover:text-[#3AAFA9] transition-colors"
                                        aria-label="Quality settings"
                                    >
                                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </button>
                                    {showQualityMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-sm rounded-lg py-2 min-w-[100px] shadow-xl border border-gray-800 z-30">
                                            {QUALITIES.map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => { setQuality(q); setShowQualityMenu(false) }}
                                                    className={`block w-full px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-800 transition-colors ${q === quality ? 'text-[#3AAFA9] font-bold' : ''
                                                        }`}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Picture-in-Picture */}
                                <button onClick={togglePiP} className="hidden sm:block hover:text-[#3AAFA9] transition-colors" aria-label="Picture in Picture">
                                    <PictureInPicture className="h-5 w-5" />
                                </button>

                                {/* Fullscreen */}
                                <button onClick={toggleFullscreen} className="p-1 sm:p-0 hover:text-[#3AAFA9] transition-colors active:scale-90" aria-label="Toggle Fullscreen">
                                    {isFullscreen ? <Minimize className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
