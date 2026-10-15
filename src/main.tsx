import { render } from 'preact';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/vietnamese-400.css';
import '@fontsource/nunito/vietnamese-700.css';
import '@fontsource/nunito/vietnamese-800.css';
import './styles.css';
import { App } from './App';
import { injectTokens } from './ui/tokens.ts';

injectTokens();
render(<App />, document.getElementById('app')!);
