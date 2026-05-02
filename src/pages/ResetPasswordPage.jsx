import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import AppTopBar from '../components/AppTopBar';
import { supabase } from '../lib/supabaseClient';

function hashHasRecoveryType() {
  const raw = window.location.hash?.replace(/^#/, '') ?? '';
  const params = new URLSearchParams(raw);
  return params.get('type') === 'recovery';
}

/**
 * Dedicated route for Supabase password recovery. The email link must use redirectTo .../resetpassword.
 * Tokens arrive in the URL hash; the client establishes a short-lived recovery session, then updateUser({ password }) is allowed.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  /** From recovery session (`session.user.email`). */
  const [recoveryEmail, setRecoveryEmail] = useState('');
  /** After first getSession completes — avoids flashing “invalid link” while the client reads the hash. */
  const [sessionChecked, setSessionChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(
    () =>
      recoveryReady &&
      password.length >= 6 &&
      password === confirm &&
      !busy &&
      supabase,
    [recoveryReady, password, confirm, busy]
  );

  useEffect(() => {
    if (!supabase) {
      setSessionChecked(true);
      return undefined;
    }

    let cancelled = false;

    const markReadyFromSession = (session) => {
      if (cancelled || !session?.user) return;
      setRecoveryReady(true);
      setRecoveryEmail(session.user.email ?? '');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        markReadyFromSession(session);
        return;
      }
      if (event === 'INITIAL_SESSION' && session && hashHasRecoveryType()) {
        markReadyFromSession(session);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user && hashHasRecoveryType()) {
        markReadyFromSession(session);
      }
      setSessionChecked(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !supabase) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 1500);
  };

  return (
    <div className="App">
      <AppTopBar />
      <Box
        className="app-main-area"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          pt: 4,
          px: 2,
          pb: 4,
          overflow: 'auto',
          backgroundColor: 'rgba(0,0,0,0.04)',
        }}
      >
        <Paper elevation={2} sx={{ maxWidth: 420, width: '100%', p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Set a new password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This page works only when you open the link from your password-reset email. After you save, you will be
            redirected to the map.
          </Typography>

          {!supabase && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Auth service is not configured. Please contact the site manager.
            </Alert>
          )}

          {supabase && !sessionChecked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Verifying your reset link…
            </Alert>
          )}

          {sessionChecked && !recoveryReady && supabase && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No valid recovery session. Use the link in your email, or{' '}
              <Link component={RouterLink} to="/">
                return to the map
              </Link>{' '}
              and request a new reset link from the login dialog.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password updated. Redirecting…
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {recoveryReady && (
              <TextField
                fullWidth
                size="small"
                type="email"
                label="Email"
                value={recoveryEmail || '—'}
                disabled
                sx={{ mb: 2 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
            <TextField
              fullWidth
              size="small"
              type="password"
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!recoveryReady || busy || success}
              sx={{ mb: 2 }}
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!recoveryReady || busy || success}
              sx={{ mb: 2 }}
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" fullWidth disabled={!canSubmit || success}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/" variant="body2">
              Back to map
            </Link>
          </Box>
        </Paper>
      </Box>
    </div>
  );
}
