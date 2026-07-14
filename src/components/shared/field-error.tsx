/**
 * Inline, accessible field error. Renders nothing when there is no error so
 * the DOM node (and its id, referenced by aria-describedby) only exists when
 * a message is present.
 */
export function FieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  if (!messages || messages.length === 0) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}
