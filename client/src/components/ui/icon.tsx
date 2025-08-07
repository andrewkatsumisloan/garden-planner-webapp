import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconProps {
  Icon: LucideIcon;
  variant?: 'default' | 'soft' | 'subtle' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  isActive?: boolean;
}

export function Icon({ 
  Icon, 
  variant = 'default', 
  size = 'sm', 
  className,
  isActive = false 
}: IconProps) {
  const baseClasses = "transition-all duration-200 ease-out";
  
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4", 
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };
  
  const variantClasses = {
    default: isActive 
      ? "text-slate-700 drop-shadow-sm" 
      : "text-slate-500 hover:text-slate-700",
    soft: isActive
      ? "text-emerald-600 bg-emerald-50 rounded-lg p-1 drop-shadow-sm"
      : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg p-1 hover:drop-shadow-sm",
    subtle: isActive
      ? "text-stone-600 bg-stone-100 rounded-full p-1.5 shadow-inner"
      : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full p-1.5 hover:shadow-sm",
    accent: isActive
      ? "text-blue-600 bg-blue-50 rounded-xl p-1.5 shadow-md"
      : "text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl p-1.5 hover:shadow-md"
  };
  
  return (
    <Icon 
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}

// Specialized icon variants for different use cases
export function ToolIcon({ Icon, isActive, className }: { Icon: LucideIcon, isActive?: boolean, className?: string }) {
  return <Icon Icon={Icon} variant="soft" size="sm" isActive={isActive} className={className} />;
}

export function ActionIcon({ Icon, className }: { Icon: LucideIcon, className?: string }) {
  return <Icon Icon={Icon} variant="subtle" size="sm" className={className} />;
}

export function NavIcon({ Icon, isActive, className }: { Icon: LucideIcon, isActive?: boolean, className?: string }) {
  return <Icon Icon={Icon} variant="accent" size="md" isActive={isActive} className={className} />;
}

export function StatusIcon({ Icon, className }: { Icon: LucideIcon, className?: string }) {
  return <Icon Icon={Icon} variant="default" size="xs" className={className} />;
}