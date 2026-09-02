import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme-context';

interface ThemeToggleProps {
  size?: number;
}

export default function ThemeToggle({ size = 46 }: ThemeToggleProps) {
  const { isDark, palette, toggle } = useTheme();

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.cardSoft,
          borderColor: palette.borderSoft,
          shadowColor: '#000000',
          shadowOpacity: isDark ? 0.35 : 0.1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      {isDark ? (
        <Ionicons name="sunny" size={size * 0.48} color="#fbbf24" />
      ) : (
        <Ionicons name="moon" size={size * 0.48} color="#334155" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
});