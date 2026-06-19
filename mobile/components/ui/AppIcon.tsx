import { FontAwesome6 } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

type IconName =
  | "book"
  | "home"
  | "revise"
  | "exercise"
  | "trophy"
  | "bell"
  | "fire"
  | "calendar"
  | "clock"
  | "bolt"
  | "keyboard"
  | "check"
  | "close"
  | "share"
  | "arrow"
  | "back"
  | "mail"
  | "lock"
  | "person"
  | "shield"
  | "ellipsis"
  | "volume"
  | "turtle"
  | "list";

export function AppIcon({
  name,
  size = 20,
  color = Colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const mapping = {
    book: (
      <FontAwesome6 name="book" size={size} color={color} iconStyle="solid" />
    ),
    home: (
      <FontAwesome6 name="house" size={size} color={color} iconStyle="solid" />
    ),
    revise: (
      <FontAwesome6
        name="rotate-right"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    exercise: (
      <FontAwesome6
        name="dumbbell"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    trophy: (
      <FontAwesome6 name="trophy" size={size} color={color} iconStyle="solid" />
    ),
    bell: (
      <FontAwesome6 name="bell" size={size} color={color} iconStyle="regular" />
    ),
    fire: (
      <FontAwesome6 name="fire" size={size} color={color} iconStyle="solid" />
    ),
    calendar: (
      <FontAwesome6
        name="calendar-day"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    clock: (
      <FontAwesome6
        name="clock"
        size={size}
        color={color}
        iconStyle="regular"
      />
    ),
    bolt: (
      <FontAwesome6 name="bolt" size={size} color={color} iconStyle="solid" />
    ),
    keyboard: (
      <FontAwesome6
        name="keyboard"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    check: (
      <FontAwesome6 name="check" size={size} color={color} iconStyle="solid" />
    ),
    close: (
      <FontAwesome6 name="xmark" size={size} color={color} iconStyle="solid" />
    ),
    share: (
      <FontAwesome6
        name="share-nodes"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    arrow: (
      <FontAwesome6
        name="arrow-right"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    back: (
      <FontAwesome6
        name="arrow-left"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    mail: (
      <FontAwesome6
        name="envelope"
        size={size}
        color={color}
        iconStyle="regular"
      />
    ),
    lock: (
      <FontAwesome6 name="lock" size={size} color={color} iconStyle="solid" />
    ),
    person: (
      <FontAwesome6 name="user" size={size} color={color} iconStyle="regular" />
    ),
    shield: (
      <FontAwesome6
        name="shield-halved"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    ellipsis: (
      <FontAwesome6
        name="ellipsis-vertical"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    volume: (
      <FontAwesome6
        name="volume-high"
        size={size}
        color={color}
        iconStyle="solid"
      />
    ),
    turtle: (
      <FontAwesome6 name="turtle" size={size} color={color} iconStyle="solid" />
    ),
    list: (
      <FontAwesome6 name="list" size={size} color={color} iconStyle="solid" />
    ),
  };

  return mapping[name];
}

export type { IconName };
