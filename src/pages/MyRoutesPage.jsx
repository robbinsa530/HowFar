import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { useSelector } from 'react-redux';
import AppTopBar from '../components/AppTopBar';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { fetchMyRoutes, deleteRouteOnServer } from '../controllers/ImportExportController';

function formatCreatedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLength(lengthMeters, imperialOrMetric) {
  if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) return '—';
  if (imperialOrMetric === 'imperial') {
    return `${(lengthMeters / 1609.344).toFixed(2)} mi`;
  }
  return `${(lengthMeters / 1000).toFixed(2)} km`;
}

export default function MyRoutesPage() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useSupabaseAuth();
  const { imperialOrMetric } = useSelector((state) => state.settings);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingUuid, setDeletingUuid] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      setError('Not signed in.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyRoutes(token)
      .then((list) => {
        if (!cancelled) setRoutes(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load routes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, session?.access_token, navigate]);

  const handleView = (shareUuid) => {
    navigate(`/route/${encodeURIComponent(shareUuid)}`);
  };

  const handleEdit = (shareUuid) => {
    navigate(`/editing/${encodeURIComponent(shareUuid)}`);
  };

  const handleDelete = async (route) => {
    const displayName = route.name?.trim() ? route.name.trim() : 'Untitled route';
    if (!window.confirm(`Delete "${displayName}"? This cannot be undone.`)) {
      return;
    }
    const token = session?.access_token;
    if (!token) {
      setError('Not signed in.');
      return;
    }
    setDeletingUuid(route.shareUuid);
    setError(null);
    try {
      await deleteRouteOnServer({ accessToken: token, shareUuid: route.shareUuid });
      setRoutes((prev) => prev.filter((r) => r.shareUuid !== route.shareUuid));
    } catch (err) {
      setError(err.message ?? 'Failed to delete route.');
    } finally {
      setDeletingUuid(null);
    }
  };

  return (
    <div className="App">
      <AppTopBar />
      <Box
        className="app-main-area"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 4,
          px: 2,
          pb: 4,
          overflow: 'auto',
          backgroundColor: 'rgba(0,0,0,0.04)',
        }}
      >
        <Paper elevation={2} sx={{ maxWidth: 720, width: '100%', p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            My Routes
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {!loading && !error && routes.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              You have no saved routes.
            </Typography>
          )}

          {!loading && routes.length > 0 && (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {routes.map((route) => (
                <Box
                  component="li"
                  key={route.shareUuid}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap title={route.name || 'Untitled route'}>
                      {route.name?.trim() ? route.name : 'Untitled route'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatCreatedAt(route.createdAt)}
                      {' · '}
                      {formatLength(route.lengthM, imperialOrMetric)}
                      {' · '}
                      {route.isPrivate ? (
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                          <LockIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                          Private
                        </Box>
                      ) : (
                        'Public'
                      )}
                    </Typography>
                  </Box>
                  <Tooltip title="View route">
                    <IconButton
                      aria-label={`View ${route.name || 'route'}`}
                      onClick={() => handleView(route.shareUuid)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit route">
                    <IconButton
                      aria-label={`Edit ${route.name || 'route'}`}
                      onClick={() => handleEdit(route.shareUuid)}
                      disabled={deletingUuid === route.shareUuid}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete route">
                    <IconButton
                      aria-label={`Delete ${route.name || 'route'}`}
                      onClick={() => handleDelete(route)}
                      disabled={deletingUuid === route.shareUuid}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </div>
  );
}
