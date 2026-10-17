import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  render(){if(this.state.error)return <main className="error-page"><h1>书页暂时迷了路</h1><p>存档仍保留在此设备，可重新载入继续探索。</p><pre>{this.state.error.message}</pre><button onClick={()=>location.reload()}>重新载入</button></main>;return this.props.children;}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
