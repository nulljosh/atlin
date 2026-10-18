// The brick wall glyph from brand/mark.svg, in currentColor.
export default function BrickMark({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size * 0.91} viewBox="200 228 624 568" aria-hidden="true" {...rest}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="64">
        <rect x="232" y="260" width="560" height="504" rx="48" />
        <path d="M232 428H792M232 596H792M512 260V428M372 428V596M652 428V596M512 596V764" />
      </g>
    </svg>
  )
}
