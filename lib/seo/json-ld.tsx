import { safeJsonLdStringify } from "./core"

/**
 * Single render path for every inline JSON-LD block.
 *
 * Pages must not hand-write `<script type="application/ld+json">` tags: this
 * component runs each schema through the engine's escaping (`<` -> `\u003c`)
 * so a schema string can never break out of the script element.
 */
export function SeoJsonLd({
  schemas,
}: {
  schemas: Array<Record<string, unknown> | null | undefined>
}) {
  const filtered = schemas.filter(
    (schema): schema is Record<string, unknown> => Boolean(schema)
  )
  if (filtered.length === 0) return null

  return (
    <>
      {filtered.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
        />
      ))}
    </>
  )
}
