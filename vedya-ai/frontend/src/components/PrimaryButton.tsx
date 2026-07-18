"use client";
import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function PrimaryButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeMap = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  const variantMap = {
    primary:
      "text-white hover:opacity-90 active:scale-[0.98]",
    outline:
      "border-2 hover:bg-opacity-10 active:scale-[0.98]",
  };

  const style =
    variant === "primary"
      ? { background: "var(--veda-harita)", fontFamily: "var(--font-ui)" }
      : {
          background: "transparent",
          borderColor: "var(--veda-ink)",
          color: "var(--veda-ink)",
          fontFamily: "var(--font-ui)",
        };

  return (
    <button
      className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
