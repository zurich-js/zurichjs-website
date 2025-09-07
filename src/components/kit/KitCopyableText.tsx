import { Copy, CircleCheckBig } from "lucide-react";
import React from "react";

export default function KitCopyableText({
  text,
  className = '',
  onCopy,
}: {
  text: string;
  className?: string;
  onCopy?: () => void;
}) {
  const [isCopied, setIsCopied] = React.useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            if (onCopy) onCopy();
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    return (
        <span role="button" className={`inline relative group transition-all duration-300 ${className}`} onClick={copyToClipboard}>
          {text}
          {isCopied ? (
            <CircleCheckBig className="inline-block ml-1 mb-[0.1em]" size={12} />
          ) : (
            <Copy
              size={12}
              className="inline-block ml-1 mb-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              Copy
            </Copy>
          )}

        </span>
    )
}
