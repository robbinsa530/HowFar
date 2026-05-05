import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { saveRouteToServer, updateRouteOnServer } from '../../controllers/ImportExportController';
import { setMenuOpen, setSaveRouteDialogOpen } from '../../store/slices/displaySlice';
import { clearEditingSavedRoute } from '../../store/slices/savedRouteSlice';

export default function SaveRouteDialog() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { session } = useSupabaseAuth();
  const { geojson } = useSelector((state) => state.route);
  const { pins } = useSelector((state) => state.map);
  const { saveRouteDialogOpen: open } = useSelector((state) => state.display);
  const savedRoute = useSelector((state) => state.savedRoute);
  const editingExistingRoute = Boolean(savedRoute.editingRouteUuid);
  const [routeName, setRouteName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRouteName(editingExistingRoute ? (savedRoute.name ?? '') : '');
      setIsPrivate(editingExistingRoute ? Boolean(savedRoute.isPrivate) : false);
      setSaving(false);
    }
  }, [open, editingExistingRoute, savedRoute.name, savedRoute.isPrivate]);

  const handleClose = () => {
    if (saving) return;
    dispatch(setSaveRouteDialogOpen(false));
  };

  const handleSave = async () => {
    const trimmed = routeName.trim();
    if (!trimmed) {
      alert('Please enter a route name.');
      return;
    }
    if (!session?.access_token) {
      alert('You must be logged in to save.');
      return;
    }
    setSaving(true);
    try {
      let shareUuid;
      if (editingExistingRoute) {
        ({ shareUuid } = await updateRouteOnServer({
          accessToken: session.access_token,
          shareUuid: savedRoute.editingRouteUuid,
          name: trimmed,
          isPrivate,
          routeGeojson: geojson,
          pins,
        }));
      } else {
        ({ shareUuid } = await saveRouteToServer({
          accessToken: session.access_token,
          name: trimmed,
          isPrivate,
          routeGeojson: geojson,
          pins,
        }));
      }
      dispatch(clearEditingSavedRoute());
      dispatch(setSaveRouteDialogOpen(false));
      dispatch(setMenuOpen(false));
      navigate(`/route/${encodeURIComponent(shareUuid)}`);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} maxWidth="sm" fullWidth aria-labelledby="save-route-dialog-title">
      <DialogTitle id="save-route-dialog-title">{editingExistingRoute ? 'Update route' : 'Save route'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Route name"
          fullWidth
          variant="outlined"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          disabled={saving}
          sx={{ mt: 1 }}
        />
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={saving}
              color="primary"
            />
          }
          label="Private (only you can open this route when logged in)"
        />
        {saving && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={22} />
            <span>{editingExistingRoute ? 'Updating…' : 'Saving…'}</span>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="primary" onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {editingExistingRoute ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
