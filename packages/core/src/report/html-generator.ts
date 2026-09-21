import type { ReviewReportData } from '../schema/review-report.ts';

/**
 * fuji44-pr-review-contract に完全準拠した自己完結型 HTML レポートを生成する
 */
export function generateStandaloneReviewHtml(
  reportData: ReviewReportData,
  options?: { repo?: string; prNumber?: number; title?: string }
): string {
  const prNum = options?.prNumber ?? reportData.pr?.number ?? 0;
  const prTitle = options?.title ?? reportData.pr?.title ?? 'Review Report';
  const briefText = typeof reportData.summary.brief === 'string'
    ? reportData.summary.brief
    : (reportData.summary.brief.problem ?? reportData.summary.brief.approach ?? '');

  // JSON 内の </script> による早期終了を防ぐエスケープ
  const safeJsonData = JSON.stringify(reportData).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR #${prNum} レビューレポート — ${prTitle}</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --border: #30363d;
      --text-primary: #c9d1d9;
      --text-secondary: #8b949e;
      --text-heading: #f0f6fc;
      --accent: #58a6ff;
      --accent-hover: #1f6feb;
      --p1: #f85149;
      --p2: #d29922;
      --p3: #58a6ff;
    }
    @media (prefers-color-scheme: light) {
      :root[data-theme="light"] {
        --bg-primary: #ffffff;
        --bg-secondary: #f6f8fa;
        --bg-tertiary: #eaEEf2;
        --border: #d0d7de;
        --text-primary: #24292f;
        --text-secondary: #57606a;
        --text-heading: #1f2328;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .eyebrow {
      font-size: 11px;
      font-family: monospace;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    h1 {
      font-size: 20px;
      color: var(--text-heading);
      margin-bottom: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
      border: 1px solid currentColor;
    }
    .badge-approve { color: #3fb950; background: rgba(46,160,67,0.15); }
    .badge-comment { color: #58a6ff; background: rgba(56,139,253,0.15); }
    .badge-request { color: #f85149; background: rgba(248,81,73,0.15); }
    .sticky-bar {
      position: sticky;
      top: 12px;
      z-index: 100;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .index-rail {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      margin-bottom: 20px;
    }
    .index-chip {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: monospace;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .index-chip:hover { border-color: var(--accent); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #6e7681; }
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 16px;
      transition: all 0.2s ease;
    }
    .card.decision-post { border-color: #2ea043; background: rgba(46,160,67,0.06); }
    .card.decision-hold { border-color: #d29922; background: rgba(210,153,34,0.06); }
    .card.decision-ignore { opacity: 0.5; }
    .btn {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn:hover { background: var(--border); }
    .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-active-post { background: #238636 !important; color: #fff !important; }
    .btn-active-hold { background: #d29922 !important; color: #fff !important; }
    .btn-active-ignore { background: #6e7681 !important; color: #fff !important; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
    .def-list {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      margin: 10px 0;
    }
    .def-list > div { margin-bottom: 8px; }
    .def-list > div:last-child { margin-bottom: 0; }
    .diagram-box {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      overflow-x: auto;
      text-align: center;
    }
    .diagram-box svg { max-width: 100%; height: auto; }
    textarea.note-input {
      width: 100%;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      border-radius: 6px;
      padding: 8px;
      font-size: 12px;
      margin-top: 8px;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">AI Review Report • PR #${prNum}</div>
    <h1>${prTitle}</h1>
    <div style="display:flex; align-items:center; gap: 10px; margin-top: 10px;">
      <span class="badge badge-${reportData.verdict.toLowerCase()}">${reportData.verdict}</span>
      <span style="font-size: 12px; color: var(--text-secondary);">※ タグや判定は候補です。精査ボードで確定させてください。</span>
    </div>
  </header>

  <!-- Sticky 判断ボード集計ストリップ -->
  <div class="sticky-bar">
    <div style="display:flex; align-items:center; gap: 10px; font-size: 13px;">
      <strong>精査ボード:</strong>
      <span id="stat-post" class="badge" style="color:#3fb950">投稿: 0</span>
      <span id="stat-hold" class="badge" style="color:#d29922">保留: 0</span>
      <span id="stat-ignore" class="badge" style="color:#8b949e">不投稿: 0</span>
      <span id="stat-unset" class="badge" style="color:#58a6ff">未選択: 0</span>
    </div>
    <div style="display:flex; gap: 8px;">
      <button class="btn" onclick="bulkMark('post')">全件投稿マーク</button>
      <button class="btn" onclick="clearDecisions()">クリア</button>
      <button class="btn btn-primary" onclick="copyDecisions()">引き継ぎテキストをコピー</button>
    </div>
  </div>

  <!-- C1...Cn 索引チップレール -->
  <div class="index-rail" id="index-rail"></div>

  <!-- 要約セクション -->
  <div class="card">
    <h2 style="font-size: 16px; margin-bottom: 12px;">AI レビュー要約</h2>
    <div class="grid-2">
      <div style="background:var(--bg-primary); padding:12px; border-radius:8px; border:1px solid var(--border)">
        <div style="font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase">PR要約</div>
        <p style="font-size:13px; margin-top:4px;">${briefText}</p>
      </div>
      <div style="background:var(--bg-primary); padding:12px; border-radius:8px; border:1px solid var(--border)">
        <div style="font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase">中核コード変更</div>
        <p style="font-size:13px; margin-top:4px; font-family:monospace">${typeof reportData.summary.changedCode === 'string' ? reportData.summary.changedCode : JSON.stringify(reportData.summary.changedCode)}</p>
      </div>
    </div>

    ${reportData.summary.blastRadius ? `
    <div style="background:rgba(46,160,67,0.1); border:1px solid #2ea043; border-radius:8px; padding:12px; margin-bottom:12px;">
      <div style="font-size:11px; font-weight:600; color:#3fb950; text-transform:uppercase">免責範囲（何が変わらないか）</div>
      <p style="font-size:13px; color:#c9d1d9; margin-top:4px; font-family:monospace">${reportData.summary.blastRadius}</p>
    </div>` : ''}

    ${reportData.diagram?.svg ? `
    <div>
      <h3 style="font-size: 14px; margin-bottom: 8px;">アーキテクチャ・モジュール関係図 (D2)</h3>
      <div class="diagram-box">
        ${reportData.diagram.svg}
      </div>
    </div>` : ''}
  </div>

  <!-- 指摘一覧 -->
  <div id="comments-container"></div>

  <script type="application/json" id="review-data">${safeJsonData}</script>
  <script>
    const reportData = JSON.parse(document.getElementById('review-data').textContent);
    const storageKey = 'review-decisions-' + (reportData.pr?.number || 'standalone');
    let decisions = {};
    try {
      decisions = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch(e) {}

    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(decisions)); } catch(e) {}
      render();
    }

    function setDecision(id, status) {
      if (!decisions[id]) decisions[id] = {};
      decisions[id].status = (decisions[id].status === status) ? undefined : status;
      save();
    }

    function setNote(id, note) {
      if (!decisions[id]) decisions[id] = {};
      decisions[id].note = note;
      try { localStorage.setItem(storageKey, JSON.stringify(decisions)); } catch(e) {}
    }

    function bulkMark(status) {
      reportData.comments.forEach(c => {
        if (!decisions[c.id]) decisions[c.id] = {};
        decisions[c.id].status = status;
      });
      save();
    }

    function clearDecisions() {
      if (confirm('すべての判断をクリアしますか？')) {
        decisions = {};
        save();
      }
    }

    function copyDecisions() {
      let text = '# PR レビュー精査結果\\n\\n';
      const postComments = reportData.comments.filter(c => decisions[c.id]?.status === 'post');
      text += '## 【投稿する指摘】\\n';
      if (postComments.length === 0) text += '（なし）\\n';
      postComments.forEach(c => {
        const d = decisions[c.id];
        text += '### [' + c.id + '] ' + c.title + ' (' + c.severity + ')\\n';
        text += '- 場所: ' + c.path + ':' + c.line + '\\n';
        if (c.problem) text += '- 問題: ' + c.problem + '\\n';
        if (c.proposal) text += '- 改善案: ' + c.proposal + '\\n';
        if (d?.note) text += '- メモ: ' + d.note + '\\n';
        text += '\\n';
      });
      navigator.clipboard.writeText(text).then(() => alert('クリップボードにコピーしました！')).catch(() => prompt('コピーしてください:', text));
    }

    function render() {
      const container = document.getElementById('comments-container');
      const rail = document.getElementById('index-rail');
      container.innerHTML = '';
      rail.innerHTML = '';

      let pCount = 0, hCount = 0, iCount = 0;
      reportData.comments.forEach(c => {
        const s = decisions[c.id]?.status;
        if (s === 'post') pCount++;
        else if (s === 'hold') hCount++;
        else if (s === 'ignore') iCount++;

        // 索引チップ
        const chip = document.createElement('a');
        chip.className = 'index-chip';
        chip.href = '#comment-' + c.id;
        let dotColor = '#6e7681';
        if (s === 'post') dotColor = '#3fb950';
        if (s === 'hold') dotColor = '#d29922';
        chip.innerHTML = '<span class="dot" style="background:' + dotColor + '"></span>' + c.id;
        rail.appendChild(chip);

        // カード
        const card = document.createElement('div');
        card.id = 'comment-' + c.id;
        card.className = 'card' + (s ? ' decision-' + s : '');
        card.innerHTML = \`
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <strong>[\${c.id}]</strong>
              <span class="badge" style="color:var(--p\${c.severity === 'P1' ? '1' : c.severity === 'P2' ? '2' : '3'})">\${c.severity}</span>
              <span style="font-size:12px; color:var(--text-secondary)">\${c.category}</span>
            </div>
            <div style="display:flex; gap:4px;">
              <button class="btn \${s === 'post' ? 'btn-active-post' : ''}" onclick="setDecision('\${c.id}', 'post')">投稿する</button>
              <button class="btn \${s === 'hold' ? 'btn-active-hold' : ''}" onclick="setDecision('\${c.id}', 'hold')">保留</button>
              <button class="btn \${s === 'ignore' ? 'btn-active-ignore' : ''}" onclick="setDecision('\${c.id}', 'ignore')">投稿しない</button>
            </div>
          </div>
          <h3 style="font-size:15px; margin-bottom:4px;">\${c.title}</h3>
          <div style="font-size:12px; font-family:monospace; color:var(--accent); margin-bottom:8px;">\${c.path}:\${c.line}</div>
          <div class="def-list">
            \${c.problem ? '<div><strong style="color:var(--p1)">【問題】:</strong> ' + c.problem + '</div>' : '<div>' + c.body + '</div>'}
            \${c.proposal ? '<div><strong style="color:#3fb950">【改善案】:</strong> ' + c.proposal + '</div>' : ''}
            \${c.relationToExisting ? '<div><strong style="color:var(--accent)">【既存レビュー】:</strong> ' + c.relationToExisting + '</div>' : ''}
          </div>
          <textarea class="note-input" placeholder="判断理由やメモを入力..." onchange="setNote('\${c.id}', this.value)">\${decisions[c.id]?.note || ''}</textarea>
        \`;
        container.appendChild(card);
      });

      document.getElementById('stat-post').textContent = '投稿: ' + pCount;
      document.getElementById('stat-hold').textContent = '保留: ' + hCount;
      document.getElementById('stat-ignore').textContent = '不投稿: ' + iCount;
      document.getElementById('stat-unset').textContent = '未選択: ' + (reportData.comments.length - pCount - hCount - iCount);
    }

    render();
  </script>
</body>
</html>`;
}
