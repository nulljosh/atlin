// The map pin from brand/mark.svg, in currentColor. Same glyph as the app icon.
export default function AtlinMark({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size * 1.02} viewBox="288 224 448 600" fill="currentColor" aria-hidden="true" {...rest}>
      <path fillRule="evenodd" d="M512 812C392 676 304 568 304 444a208 208 0 0 1 416 0c0 124-88 232-208 368Z M512 372a72 72 0 1 0 0.1 0Z" />
    </svg>
  )
}
