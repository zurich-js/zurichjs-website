export default function KitTruncatedTextWithAnchor({
  text,
  limit = 170,
  anchor,
}: {
  text?: string;
  limit?: number;
  anchor?: string;
}) {
  if (!text) return null;

  const truncatedText = text.slice(0, limit) + (text.length > limit ? '...' : '');
  const isTruncated = text.length > limit;

  return (
    <p>
      {truncatedText}
      {isTruncated && (
        <span>
          <a className="text-inherit no-underline" href={'#' + anchor}>Read more</a>
        </span>
      )}
    </p>
  )
}
