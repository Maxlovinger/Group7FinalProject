import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

export default function StatCard({ label, value, icon, color = 'primary.main' }) {
  return (
    <Paper elevation={0} sx={{
      p: 3, border: '1px solid #1e2d4a', borderRadius: 2,
      background: 'linear-gradient(135deg, #111827 0%, #0d1526 100%)',
      transition: 'border-color 0.2s',
      '&:hover': { borderColor: color },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        {icon && <Box sx={{ color }}>{icon}</Box>}
        <Typography variant="caption" sx={{ color: 'grey.500', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ color, fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace' }}>
        {value}
      </Typography>
    </Paper>
  );
}
