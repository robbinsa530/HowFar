import React, { useEffect, useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';

const redirectUrl = () => `${window.location.origin}${window.location.pathname}`;
const passwordResetRedirectUrl = () => `${window.location.origin}/resetpassword`;

const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? '';

/**
 * Optional HowFar login: email + password, sign-up, or password reset via Supabase Auth.
 */
export default function HowFarLoginDialog({ open, onClose }) {
  const { supabase } = useSupabaseAuth();
  const captchaRef = useRef(null);
  const [authView, setAuthView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setAuthView('login');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
      setCaptchaToken(null);
      setMessage(null);
      setError(null);
      captchaRef.current?.resetCaptcha();
    }
  }, [open]);

  const captchaRequired = Boolean(hcaptchaSiteKey);
  const captchaOk = !captchaRequired || Boolean(captchaToken);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const authOptions = (extra = {}) => {
    const o = { ...extra };
    if (captchaRequired && captchaToken) o.captchaToken = captchaToken;
    return o;
  };

  const handleLogin = async () => {
    if (!supabase || !email.trim() || !password || !captchaOk) return;
    resetFeedback();
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: authOptions(),
    });
    setBusy(false);
    resetCaptcha();
    if (err) {
      setError(err.message);
      return;
    }
    onClose();
  };

  const handleSignUp = async () => {
    if (!supabase || !email.trim() || !password || !captchaOk) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    resetFeedback();
    setBusy(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: authOptions({
        emailRedirectTo: redirectUrl(),
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      }),
    });
    setBusy(false);
    resetCaptcha();
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(
      'Check your email to confirm your account (BE SURE TO CHECK YOUR SPAM FOLDER), then you can log in.'
    );
    setAuthView('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  const handleSendResetLink = async () => {
    if (!supabase || !email.trim() || !captchaOk) return;
    resetFeedback();
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      authOptions({ redirectTo: passwordResetRedirectUrl() })
    );
    setBusy(false);
    resetCaptcha();
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(
      'If an account exists for this email, you will receive a link to reset your password.'
    );
  };

  const authBlocked = !supabase || busy || !captchaOk;

  const switchToSignUp = () => {
    resetFeedback();
    setAuthView('signup');
    setConfirmPassword('');
  };

  const switchToLogin = () => {
    resetFeedback();
    setAuthView('login');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  const switchToForgot = () => {
    resetFeedback();
    setAuthView('forgot');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log in or Sign up</DialogTitle>
      <DialogContent>
        {authView !== 'forgot' && <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Note:</strong> Logging in is <strong>not</strong> required to map routes or view public routes. It is only
          required for saving routes to obtain shareable links.
        </Alert>}

        {authView === 'forgot' && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email and we will send you a link to choose a new password. The link opens this site; use the same
            browser if possible.
          </Typography>
        )}

        {!supabase && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Login service is not configured. Please contact the site manager.
          </Alert>
        )}

        {/* {!captchaOk && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Complete the CAPTCHA before continuing.
          </Alert>
        )} */}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {captchaRequired && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <HCaptcha
              ref={captchaRef}
              sitekey={hcaptchaSiteKey}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </Box>
        )}

        {authView === 'signup' && (
          <>
            <TextField
              fullWidth
              size="small"
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!supabase || busy}
              sx={{ mb: 2 }}
              autoComplete="given-name"
            />
            <TextField
              fullWidth
              size="small"
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!supabase || busy}
              sx={{ mb: 2 }}
              autoComplete="family-name"
            />
          </>
        )}

        <TextField
          fullWidth
          size="small"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!supabase || busy}
          sx={{ mb: 2 }}
          autoComplete="email"
        />

        {authView !== 'forgot' && (
          <TextField
            fullWidth
            size="small"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!supabase || busy}
            sx={{ mb: 2 }}
            autoComplete={authView === 'signup' ? 'new-password' : 'current-password'}
          />
        )}

        {authView === 'signup' && (
          <TextField
            fullWidth
            size="small"
            type="password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!supabase || busy}
            sx={{ mb: 2 }}
            autoComplete="new-password"
          />
        )}

        {authView === 'signup' && (
          <Button
            variant="contained"
            fullWidth
            disabled={
              authBlocked ||
              !email.trim() ||
              !password ||
              !confirmPassword ||
              !firstName.trim() ||
              !lastName.trim()
            }
            onClick={handleSignUp}
          >
            Sign up
          </Button>
        )}

        {authView === 'login' && (
          <Button
            variant="contained"
            fullWidth
            disabled={authBlocked || !email.trim() || !password}
            onClick={handleLogin}
          >
            Log in
          </Button>
        )}

        {authView === 'forgot' && (
          <Button
            variant="contained"
            fullWidth
            disabled={authBlocked || !email.trim()}
            onClick={handleSendResetLink}
          >
            Send reset link
          </Button>
        )}

        {authView !== 'forgot' && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {authView === 'signup' ? (
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={switchToLogin}
                sx={{ cursor: 'pointer' }}
              >
                Already have an account? Log in
              </Link>
            ) : (
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={switchToSignUp}
                sx={{ cursor: 'pointer' }}
              >
                No account? Sign up
              </Link>
            )}
          </Box>
        )}

        {authView !== 'forgot' && (
          <Box sx={{ mt: 1.5, textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={switchToForgot}
              sx={{ cursor: 'pointer' }}
            >
              Forgot password?
            </Link>
          </Box>
        )}

        {authView === 'forgot' && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={switchToLogin}
              sx={{ cursor: 'pointer' }}
            >
              Back to log in
            </Link>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
