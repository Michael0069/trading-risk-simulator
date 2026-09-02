import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthShell from '../components/AuthShell';
import { userAPI } from '../lib/api';
import { saveSession } from '../lib/session';
import { useTheme } from '../lib/theme-context';

export default function LoginScreen() {
  const { palette } = useTheme();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await userAPI.login({ email, password });
      await saveSession({
        id: user.id,
        username: user.username,
        current_balance: user.current_balance,
        starting_balance: user.starting_balance,
      });
      router.replace({
        pathname: '/dashboard',
        params: {
          userId: String(user.id),
          username: user.username,
          currentBalance: String(user.current_balance),
          startingBalance: String(user.starting_balance),
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      kicker="Welcome Back"
      title="Welcome back"
      subtitle="Sign in to continue paper trading with risk controls and TradeDNA coaching."
      footer={
        <View style={styles.footerLinks}>
          <View style={[styles.demoBox, { backgroundColor: palette.successBg, borderColor: palette.tipBorder }]}>
            <Text style={[styles.demoTitle, { color: palette.success }]}>Demo Credentials</Text>
            <Text style={[styles.demoText, { color: palette.tipText }]}>Email: demo@example.com</Text>
            <Text style={[styles.demoText, { color: palette.tipText }]}>Password: password123</Text>
          </View>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={[styles.link, { color: palette.brand }]}>Need an account? Create one</Text>
          </Pressable>
        </View>
      }
    >
      <View style={[styles.card, { backgroundColor: palette.cardSoft, borderColor: palette.borderSoft }]}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedSoft }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="demo@example.com"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedSoft }]}>Password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="password123"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: palette.danger, backgroundColor: palette.dangerBg }]}>{error}</Text>
        ) : null}

        <Pressable style={[styles.button, { backgroundColor: palette.brandStrong }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#f8fafc" /> : <Text style={styles.buttonText}>Login</Text>}
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  error: {
    color: '#fecaca',
    backgroundColor: '#450a0a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 16,
  },
  link: {
    color: '#7dd3fc',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '700',
  },
  footerLinks: {
    gap: 12,
  },
  demoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
