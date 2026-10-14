import { render } from 'preact';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './styles.css';
import { App } from './App';

render(<App />, document.getElementById('app')!);
