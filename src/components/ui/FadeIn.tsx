import { useInView } from "react-intersection-observer";
import type { ReactNode, CSSProperties, ElementType } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: CSSProperties;
}

export function FadeIn({
  children,
  className,
  as: Tag = "div",
  delay = 0,
  duration,
  translateY = 20,
  style,
}: FadeInProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${translateY}px)`,
        transition: `opacity var(--zjs-dur-slow, 400ms) var(--zjs-ease-out) ${delay}ms, transform var(--zjs-dur-slow, 400ms) var(--zjs-ease-out) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
