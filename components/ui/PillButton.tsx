import type { ButtonHTMLAttributes, ReactNode } from "react";

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "coral" | "light" | "subtle";
};

export default function PillButton({
  children,
  icon,
  variant = "primary",
  className = "",
  ...props
}: PillButtonProps) {
  return (
    <button className={`pill-button ${variant} ${className}`.trim()} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
