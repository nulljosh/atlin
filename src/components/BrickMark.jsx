// The running-bond wall from brand/mark.svg, in currentColor. Same glyph as the app icon.
export default function BrickMark({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size * 0.84} viewBox="176 244 672 536" fill="currentColor" aria-hidden="true" {...rest}>
      <rect x="176" y="244" width="316" height="152" rx="34" />
      <rect x="532" y="244" width="316" height="152" rx="34" />
      <rect x="176" y="436" width="138" height="152" rx="34" />
      <rect x="354" y="436" width="316" height="152" rx="34" />
      <rect x="710" y="436" width="138" height="152" rx="34" />
      <rect x="176" y="628" width="316" height="152" rx="34" />
      <rect x="532" y="628" width="316" height="152" rx="34" />
    </svg>
  )
}
