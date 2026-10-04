"use client"

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

interface CircularProgressProps {
    value: number // 0-100
    size?: number // diameter in pixels
    strokeWidth?: number
    pathColor?: string
    trailColor?: string
    textColor?: string
    showText?: boolean
}

export default function CircularProgress({
    value,
    size = 80,
    strokeWidth = 8,
    pathColor = '#1DB954',
    trailColor = '#E5E7EB',
    textColor = '#1DB954',
    showText = true
}: CircularProgressProps) {
    return (
        <div style={{ width: size, height: size }}>
            <CircularProgressbar
                value={value}
                text={showText ? `${Math.round(value)}%` : ''}
                strokeWidth={strokeWidth}
                styles={buildStyles({
                    pathColor: pathColor,
                    textColor: textColor,
                    trailColor: trailColor,
                    textSize: '24px',
                    pathTransitionDuration: 0.5,
                })}
            />
        </div>
    )
}
