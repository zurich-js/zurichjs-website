export default function TruncatedTextWithAnchor({
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
          <a href={'#' + anchor}>Read more</a>
        </span>
      )}
    </p>
  )
}
