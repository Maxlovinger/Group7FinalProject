import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import NavBar from './components/NavBar';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#00d4aa' },
    secondary: { main: '#ff6b35' },
    background: { default: '#0a0f1e', paper: '#111827' },
  },
  typography: {
    fontFamily: '"IBM Plex Mono", monospace',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
  },
  components: {
    MuiPaper:  { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 2, textTransform: 'none', fontFamily: '"IBM Plex Mono", monospace' } } },
  },
});

export default function App({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <NavBar />
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
