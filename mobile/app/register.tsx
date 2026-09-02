import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthShell from '../components/AuthShell';
import { userAPI } from '../lib/api';
import { saveSession } from '../lib/session';
import { useTheme } from '../lib/theme-context';

export default function RegisterScreen() {
  const { palette } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await userAPI.register({ username, email, password });
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
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      kicker="Join the simulator"
      title="Create your account"
      subtitle="Build skill without the noise of a real brokerage account."
      footer={
        <Pressable onPress={() => router.push('/login')}>
          <Text style={[styles.link, { color: palette.brand }]}>Already have an account? Login</Text>
        </Pressable>
      }
    >
      <View style={[styles.card, { backgroundColor: palette.cardSoft, borderColor: palette.borderSoft }]}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedSoft }]}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="trader_name"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedSoft }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
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
            placeholder="••••••••"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedSoft }]}>Confirm Password</Text>
          <TextInput
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={palette.muted}
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: palette.danger, backgroundColor: palette.dangerBg }]}>{error}</Text>
        ) : null}

        <Pressable style={[styles.button, { backgroundColor: palette.brandStrong }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#f8fafc" /> : <Text style={styles.buttonText}>Create Account</Text>}
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
});
