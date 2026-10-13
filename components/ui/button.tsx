import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-[#1448d8] text-white hover:bg-[#0f37a8] shadow-xs",
                brand: "bg-gradient-to-r from-[#1448d8] to-[#1DB954] text-white hover:opacity-95 shadow-xs",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
                outline:
                    "border border-gray-200 dark:border-gray-800 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300",
                link: "text-[#1448d8] underline-offset-4 hover:underline",
                success: "bg-[#1DB954] text-white hover:bg-[#16a34a] shadow-xs",
                warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-xs",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-lg px-3 text-xs",
                lg: "h-11 rounded-xl px-7 text-base",
                touch: "h-12 min-h-[48px] rounded-xl px-5 text-sm",
                icon: "h-9 w-9 rounded-xl",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
