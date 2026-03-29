import '@testing-library/jest-dom';
import React from 'react';

// Help React 19 in Vitest/JSDOM
(globalThis as any).React = React;
