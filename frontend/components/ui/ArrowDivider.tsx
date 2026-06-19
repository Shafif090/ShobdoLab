export function ArrowDivider({ right = false }: { right?: boolean }) {
  return (
    <div
      className={`relative -my-2 z-10 flex ${right ? "justify-end pr-12" : "justify-start pl-12"}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        className={right ? "rotate-15" : "scale-x-[-1]"}>
        <path
          d="M10 10 Q30 10 30 30 M24 25 L30 30 L36 25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
