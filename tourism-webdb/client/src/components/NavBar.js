import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import PublicIcon from '@mui/icons-material/Public';

const LINKS = [
  { label: 'Home',     path: '/' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Conflict', path: '/conflict' },
  { label: 'Flights',  path: '/flights' },
  { label: 'Search',   path: '/search' },
];

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <AppBar position="sticky" elevation={0}
      sx={{ bgcolor: '#0d1526', borderBottom: '1px solid #1e2d4a' }}>
      <Toolbar sx={{ gap: 1 }}>
        <PublicIcon sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.03em', mr: 4 }}>
          TOURISM INDEX
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
          {LINKS.map(({ label, path }) => (
            <Button
              key={path}
              component={Link}
              to={path}
              size="small"
              sx={{
                color: pathname === path ? 'primary.main' : 'grey.400',
                borderBottom: pathname === path ? '2px solid' : '2px solid transparent',
                borderColor: pathname === path ? 'primary.main' : 'transparent',
                borderRadius: 0,
                px: 2,
                '&:hover': { color: 'primary.main' },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
