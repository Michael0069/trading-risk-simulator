import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import LandingScreen from '../components/LandingScreen';
import { getSession } from '../lib/session';
import { useTheme } from '../lib/theme-context';

export default function HomeScreen() {
  const { palette } = useTheme();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const session = await getSession();
      if (session && active) {
        router.replace({
          pathname: '/dashboard',
          params: {
            userId: String(session.id),
            username: session.username,
            currentBalance: String(session.current_balance),
            startingBalance: String(session.starting_balance),
          },
        });
        return;
      }

      if (active) {
        setCheckingSession(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.screen }]}>
        <ActivityIndicator size="large" color={palette.brandStrong} />
      </View>
    );
  }

  return <LandingScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
