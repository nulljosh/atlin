// The folded map with a pin from brand/mark.svg, in currentColor. Same glyph as the app icon.
export default function AtlinMark({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size * 0.88} viewBox="192 252 656 528" fill="currentColor" fillRule="evenodd" aria-hidden="true" {...rest}>
      <path fillOpacity=".78" d="M196 304L372 256V728L196 776Z" />
      <path d="M404 256L636 304V776L404 728ZM520 696C520 696 432 590 432 448a88 88 0 0 1 176 0C608 590 520 696 520 696ZM556 448a36 36 0 1 0-72 0a36 36 0 1 0 72 0Z" />
      <path fillOpacity=".78" d="M668 304L844 256V728L668 776Z" />
    </svg>
  )
}
