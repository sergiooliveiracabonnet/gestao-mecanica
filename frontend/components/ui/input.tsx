import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-button border border-input bg-background px-3 py-2 text-base text-foreground shadow-inner-subtle ring-offset-background placeholder:text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-fast hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 md:text-sm",
          ariaInvalid === true || ariaInvalid === "true" ? "border-danger focus-visible:ring-danger" : undefined,
          className,
        )}
        ref={ref}
        aria-invalid={ariaInvalid}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
