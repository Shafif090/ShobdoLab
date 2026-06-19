type IconName =
  | "book"
  | "home"
  | "revise"
  | "exercise"
  | "trophy"
  | "bell"
  | "arrowRight"
  | "ellipsis"
  | "fire"
  | "calendar"
  | "clock"
  | "bolt"
  | "keyboard"
  | "layers"
  | "check"
  | "close"
  | "share"
  | "volume"
  | "turtle"
  | "back"
  | "user"
  | "mail"
  | "lock"
  | "shield"
  | "star";

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const iconClass = {
    book: "fa-solid fa-book",
    home: "fa-solid fa-house",
    revise: "fa-solid fa-rotate-right",
    exercise: "fa-solid fa-dumbbell",
    trophy: "fa-solid fa-trophy",
    bell: "fa-regular fa-bell",
    arrowRight: "fa-solid fa-arrow-right",
    ellipsis: "fa-solid fa-ellipsis-vertical",
    fire: "fa-solid fa-fire",
    calendar: "fa-solid fa-calendar-day",
    clock: "fa-regular fa-clock",
    bolt: "fa-solid fa-bolt",
    keyboard: "fa-solid fa-keyboard",
    layers: "fa-solid fa-layer-group",
    check: "fa-solid fa-check",
    close: "fa-solid fa-xmark",
    share: "fa-solid fa-share-nodes",
    volume: "fa-solid fa-volume-high",
    turtle: "fa-solid fa-turtle",
    back: "fa-solid fa-arrow-left",
    user: "fa-regular fa-user",
    mail: "fa-regular fa-envelope",
    lock: "fa-solid fa-lock",
    shield: "fa-solid fa-shield-halved",
    star: "fa-solid fa-star",
  }[name];

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <i className={iconClass} aria-hidden="true" />
    </span>
  );
}
