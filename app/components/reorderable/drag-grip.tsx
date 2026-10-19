// Six-dot grip marking a drag handle. Painted in currentColor, so it takes
// the handle's ink and its hover/active colours.
export function DragGrip() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <circle cx="9" cy="6" r="1.75" />
      <circle cx="15" cy="6" r="1.75" />
      <circle cx="9" cy="12" r="1.75" />
      <circle cx="15" cy="12" r="1.75" />
      <circle cx="9" cy="18" r="1.75" />
      <circle cx="15" cy="18" r="1.75" />
    </svg>
  );
}
