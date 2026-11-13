export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="prompt" aria-hidden="true">
            &gt;_
          </span>
          Toolweave AI
        </h1>
        <span className="workspace-path" aria-hidden="true">
          ~/workspace
        </span>
      </header>
      <main aria-labelledby="workspace-heading">
        <div className="workspace-header">
          <h2 id="workspace-heading">工作区</h2>
          <span className="tool-count">0 tools</span>
        </div>
        <div className="empty-workspace">
          <span className="empty-symbol" aria-hidden="true">
            [ ]
          </span>
          <p>尚未添加工具</p>
        </div>
      </main>
    </div>
  );
}
