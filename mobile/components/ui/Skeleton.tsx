import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

type SkeletonProps = {
  style?: ViewStyle;
};

export function Skeleton({ style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#E5E7EB",
          borderRadius: 16,
          opacity,
        },
        style,
      ]}
    />
  );
}
