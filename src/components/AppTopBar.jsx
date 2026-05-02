import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockIcon from '@mui/icons-material/Lock';
import { setMenuOpen } from '../store/slices/displaySlice';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { useHowFarLogin } from '../context/HowFarLoginContext';

function getInitials(user) {
  if (!user) return '?';
  const meta = user.user_metadata ?? {};
  const fn = typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  const ln = typeof meta.last_name === 'string' ? meta.last_name.trim() : '';
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  if (fn.length >= 2) return fn.slice(0, 2).toUpperCase();
  if (fn.length === 1) return fn.toUpperCase();
  const email = user.email;
  if (email) {
    const local = email.split('@')[0] ?? '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    if (local.length === 1) return local.toUpperCase();
  }
  return '?';
}

export default function AppTopBar() {
  const dispatch = useDispatch();
  const { name: savedRouteName, isPrivate: savedRouteIsPrivate } = useSelector(
    (state) => state.savedRoute
  );

  const { user, loading: authLoading, supabase } = useSupabaseAuth();
  const { openLogin } = useHowFarLogin();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const initials = useMemo(() => getInitials(user), [user]);

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleSignOut = async () => {
    handleCloseUserMenu();
    await supabase?.auth.signOut();
  };

  return (
    <Box
      component="header"
      className="app-top-bar"
      sx={{
        flexShrink: 0,
        height: 'var(--app-top-bar-height)',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        px: 1,
        pr: 2,
        backgroundColor: 'rgba(35, 55, 75, 0.8)',
        color: 'white',
        boxSizing: 'border-box',
        zIndex: 20,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Tooltip disableInteractive title={<Typography>More options (apps, display, import/export, etc.)</Typography>}>
        <IconButton
          onClick={() => dispatch(setMenuOpen(true))}
          aria-label="Open settings menu"
          sx={{ color: 'white', mr: 0.5 }}
        >
          <MenuIcon />
        </IconButton>
      </Tooltip>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
        }}
      >
        {savedRouteName?.trim() ? (
          <Chip
            label={
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  maxWidth: '100%',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {savedRouteName}
                </Box>
                {savedRouteIsPrivate && (
                  <Tooltip disableInteractive title="Private Route">
                    <span>
                      <LockIcon
                        aria-label="Private route"
                        sx={{
                          fontSize: '1.05rem',
                          flexShrink: 0,
                          display: 'block',
                          opacity: 0.95,
                        }}
                      />
                    </span>
                  </Tooltip>
                )}
              </Box>
            }
            size="medium"
            sx={{
              maxWidth: 'min(480px, 100%)',
              height: 'auto',
              py: 0.5,
              bgcolor: 'rgba(255,255,255,0.22)',
              color: 'common.white',
              border: '1px solid rgba(255,255,255,0.5)',
              fontWeight: 600,
              '& .MuiChip-label': {
                overflow: 'hidden',
                px: 1.25,
                py: 0.35,
              },
            }}
          />
        ) : null}
      </Box>

      {!authLoading && user ? (
        <>
          <Tooltip disableInteractive title="Account">
            <IconButton
              onClick={handleOpenUserMenu}
              aria-label="Open account menu"
              aria-controls={userMenuAnchor ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={userMenuAnchor ? 'true' : undefined}
              sx={{ p: 0.25, color: 'white' }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  bgcolor: 'rgba(255,255,255,0.22)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="account-menu"
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: { minWidth: 240, mt: 0.5 },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, maxWidth: 300 }}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                Email
              </Typography>
              <Typography
                variant="body2"
                sx={{ wordBreak: 'break-all', userSelect: 'text', cursor: 'default' }}
              >
                {user.email ?? user.id}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
          </Menu>
        </>
      ) : (
        <Link
          component="button"
          type="button"
          onClick={openLogin}
          disabled={authLoading}
          underline="hover"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'white',
            cursor: authLoading ? 'default' : 'pointer',
            opacity: authLoading ? 0.6 : 1,
            fontSize: '0.95rem',
            fontWeight: 500,
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            p: 0,
          }}
        >
          Log in / Sign up
          <ArrowForwardIcon sx={{ fontSize: '1.15rem' }} />
        </Link>
      )}
    </Box>
  );
}
