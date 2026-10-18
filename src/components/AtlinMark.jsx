// The house-in-a-pin from brand/mark.svg, in currentColor. Same glyph as the app icon.
export default function AtlinMark({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size * 1.06} viewBox="288 216 448 612" fill="currentColor" aria-hidden="true" {...rest}>
      <path fillRule="evenodd" d="M512 820C388 680 296 568 296 440a216 216 0 0 1 432 0c0 128-92 240-216 380Z M512 318L650 440H600V556H424V440H374Z M486 556V488H538V556Z" />
    </svg>
  )
}
