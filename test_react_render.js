import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './src/App.jsx';

try {
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log('React Render Success! HTML Length:', html.length);
  console.log('Contains SVG:', html.includes('<svg'));
  console.log('Contains path:', html.includes('<path'));
} catch (e) {
  console.error('REACT RENDER CRASHED:', e);
}
