import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { catalogue } from '../catalogue/catalogue';
import template from '../scenarios/_template';
import { Lab } from './Lab';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in lab.html');

// In development the catalogue includes development-only scenarios; the
// template is added so a new scenario's starting point can be watched too.
createRoot(root).render(
  <StrictMode>
    <Lab scenarios={[...catalogue, template]} />
  </StrictMode>,
);
