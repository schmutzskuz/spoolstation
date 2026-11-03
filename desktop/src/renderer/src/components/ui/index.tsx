import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------- Button ---------------- */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline: 'border border-border bg-transparent hover:bg-accent',
        ghost: 'hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('rounded-none border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  )
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={cn('text-base font-semibold leading-none', className)} {...props} />
}
export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

/* ---------------- Input / Textarea / Label ---------------- */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label className={cn('text-sm font-medium text-muted-foreground', className)} {...props} />
  )
}

/* ---------------- Badge ---------------- */
export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'danger' | 'muted' | 'warning'
}): JSX.Element {
  const styles: Record<string, string> = {
    default: 'bg-primary/15 text-primary',
    success: 'bg-success/15 text-success',
    danger: 'bg-destructive/15 text-destructive',
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning'
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
      {...props}
    />
  )
}

/* ---------------- Switch ---------------- */
export function Switch({
  checked,
  onCheckedChange,
  disabled
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }): JSX.Element {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}

/* ---------------- Select ---------------- */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

/* ---------------- Dialog ---------------- */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}): JSX.Element | null {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[85vh] w-full flex-col rounded-[10px] border border-border bg-card',
          wide ? 'max-w-2xl' : 'max-w-lg'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border p-5">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------------- Alert ---------------- */
export function Alert({
  className,
  variant = 'default',
  children
}: {
  className?: string
  variant?: 'default' | 'danger' | 'warning'
  children: React.ReactNode
}): JSX.Element {
  const styles: Record<string, string> = {
    default: 'border-border bg-muted/40 text-foreground',
    danger: 'border-destructive/40 bg-destructive/10 text-destructive',
    warning: 'border-warning/40 bg-warning/10 text-warning'
  }
  return (
    <div className={cn('rounded-md border px-3 py-2 text-sm', styles[variant], className)}>
      {children}
    </div>
  )
}
