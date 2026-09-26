import type { Diagram, DiagramNode, DiagramEdge } from '@kuramori/core';
import { D2 } from 'npm:@d2lang/d2';

/**
 * D2 ソースコードを JS ラッパー (@d2lang/d2) を使ってインメモリ SVG にコンパイルする
 */
export async function compileD2ToSvg(
  d2Source: string,
  options?: { layout?: 'tala' | 'elk' | 'dagre'; theme?: number; d2Bin?: string }
): Promise<string> {
  const layout = options?.layout ?? 'tala';
  const theme = options?.theme ?? 200; // 200: Dark mode theme (Catppuccin Mocha風)

  // 1. @d2lang/d2 JS (WASM) ラッパーを第一優先で使用
  let d2Instance: any = null;
  try {
    d2Instance = new D2();
    const result = await d2Instance.compile(d2Source, {
      layout,
      themeID: theme,
      noXMLTag: true,
    });
    const rawSvg = await d2Instance.render(result.diagram, result.renderOptions);
    return postProcessSvg(rawSvg);
  } catch (jsErr: any) {
    // tala で例外が起きた場合は elk でリトライ
    if (layout === 'tala' && d2Instance) {
      try {
        const result = await d2Instance.compile(d2Source, {
          layout: 'elk',
          themeID: theme,
          noXMLTag: true,
        });
        const rawSvg = await d2Instance.render(result.diagram, result.renderOptions);
        return postProcessSvg(rawSvg);
      } catch {
        // 次のフォールバックへ
      }
    }

    // 2. JS ラッパーで予期せぬ失敗があった場合、CLI が存在すればフォールバック
    const d2Bin = options?.d2Bin ?? Deno.env.get('D2_BIN') ?? 'd2';
    try {
      const cmd = new Deno.Command(d2Bin, {
        args: [`--layout=${layout}`, `--theme=${theme}`, '-'],
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'piped',
      });
      const process = cmd.spawn();
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(d2Source));
      await writer.close();
      const output = await process.output();
      if (output.code === 0) {
        const rawSvg = new TextDecoder().decode(output.stdout);
        return postProcessSvg(rawSvg);
      }
    } catch {
      // CLI がない場合は元の JS エラーをスロー
    }

    throw new Error(`D2 JS compilation failed: ${jsErr.message || jsErr}`);
  } finally {
    if (d2Instance && typeof d2Instance.dispose === 'function') {
      try {
        await d2Instance.dispose();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * D2 SVG の後処理: XML宣言除去、背景 rect の透過処理、アスペクト比保持
 */
export function postProcessSvg(rawSvg: string): string {
  let svg = rawSvg.replace(/<\?xml[\s\S]*?\?>/, '').trim();

  // D2 のキャンバス全体を覆う背景 rect を透明化（Web UI の背景と統一）
  svg = svg.replace(
    /(<rect\s+[^>]*?class="[^"]*?fill-N7[^"]*?"[^>]*?fill=")[^"]+(")/,
    '$1transparent$2'
  );
  // class がない場合でも最外層直後の巨大背景 rect を透明化
  svg = svg.replace(
    /(<svg[^>]*?>\s*<svg[^>]*?>\s*<rect\s+[^>]*?fill=")[^"]+(")/,
    '$1transparent$2'
  );

  // ノードとエッジに data-node-id / data-edge-from / data-edge-to を付与（ホバーアニメーション用）
  svg = svg.replace(/<g class="([A-Za-z0-9+/=]+)">/g, (match, b64) => {
    try {
      const decoded = atob(b64);
      const edgeMatch = decoded.match(/^\((.+?)\s*-&gt;\s*(.+?)\)\[\d+\]$/);
      if (edgeMatch) {
        return `<g class="${b64} d2-edge" data-edge-from="${edgeMatch[1]}" data-edge-to="${edgeMatch[2]}">`;
      }
      return `<g class="${b64} d2-node" data-node-id="${decoded}">`;
    } catch {
      return match;
    }
  });

  return svg;
}

/**
 * Diagram オブジェクトからレイヤー構造・コンテナを持った洗練された D2 ソースコードを生成する
 */
export function generateD2FromDiagram(diagram: Diagram): string {
  const lines: string[] = [
    'direction: right',
    '',
  ];

  // ノードをレイヤーごとに分類
  const layerGroups = {
    usecases: { name: 'Application UseCases / Triggers (操作起点)', nodes: [] as DiagramNode[] },
    services: { name: 'Domain Services & Logic (中核ロジック)', nodes: [] as DiagramNode[] },
    storage: { name: 'Repositories & Data Stores (永続層)', nodes: [] as DiagramNode[] },
    other: { name: 'Modules & Components', nodes: [] as DiagramNode[] },
  };

  const nodeToGroupMap = new Map<string, string>();
  const allNodesMap = new Map<string, DiagramNode>();

  for (const node of diagram.nodes) {
    allNodesMap.set(node.id, node);
  }

  // エッジに出てくるがノード未定義のものを暗黙の依存ノードとして補完
  for (const edge of diagram.edges) {
    if (!allNodesMap.has(edge.from)) {
      allNodesMap.set(edge.from, { id: edge.from, label: edge.from, type: 'dependency' });
    }
    if (!allNodesMap.has(edge.to)) {
      allNodesMap.set(edge.to, { id: edge.to, label: edge.to, type: 'dependency' });
    }
  }

  for (const node of allNodesMap.values()) {
    const idLower = (node.id + ' ' + node.label).toLowerCase();
    if (
      idLower.includes('usecase') ||
      idLower.includes('trigger') ||
      idLower.includes('controller') ||
      idLower.includes('handler') ||
      idLower.includes('route') ||
      idLower.includes('endpoint')
    ) {
      layerGroups.usecases.nodes.push(node);
      nodeToGroupMap.set(node.id, 'usecases');
    } else if (
      idLower.includes('repo') ||
      idLower.includes('database') ||
      idLower.includes('firestore') ||
      idLower.includes('model') ||
      idLower.includes('entity') ||
      idLower.includes('store') ||
      idLower.includes('db')
    ) {
      layerGroups.storage.nodes.push(node);
      nodeToGroupMap.set(node.id, 'storage');
    } else if (
      idLower.includes('service') ||
      idLower.includes('helper') ||
      idLower.includes('logic') ||
      idLower.includes('calc') ||
      idLower.includes('select') ||
      idLower.includes('domain')
    ) {
      layerGroups.services.nodes.push(node);
      nodeToGroupMap.set(node.id, 'services');
    } else {
      layerGroups.other.nodes.push(node);
      nodeToGroupMap.set(node.id, 'other');
    }
  }

  // 複数グループにノードがある場合はコンテナ（subgraph）として構造化
  const hasMultipleLayers =
    [layerGroups.usecases, layerGroups.services, layerGroups.storage].filter(
      (g) => g.nodes.length > 0
    ).length >= 2;

  const renderNode = (node: DiagramNode, indent: string) => {
    const safeId = sanitizeD2Id(node.id);
    const label = node.label.replace(/【C\d+】\s*/g, '').replace(/"/g, '\\"').trim();

    const nodeLines: string[] = [];
    nodeLines.push(`${indent}${safeId}: "${label}" {`);

    const idLower = (node.id + ' ' + node.label).toLowerCase();
    const isDb =
      idLower.includes('repo') ||
      idLower.includes('db') ||
      idLower.includes('firestore') ||
      idLower.includes('database') ||
      idLower.includes('table');

    if (isDb) {
      nodeLines.push(`${indent}  shape: cylinder`);
    } else {
      nodeLines.push(`${indent}  shape: rectangle`);
    }

    if (node.type === 'modified') {
      nodeLines.push(`${indent}  style.fill: "#3b1717"`);
      nodeLines.push(`${indent}  style.stroke: "#f43f5e"`);
      nodeLines.push(`${indent}  style.stroke-width: 2`);
      nodeLines.push(`${indent}  style.font-color: "#fecdd3"`);
      nodeLines.push(`${indent}  style.bold: true`);
    } else if (node.type === 'affected') {
      nodeLines.push(`${indent}  style.fill: "#2e1065"`);
      nodeLines.push(`${indent}  style.stroke: "#a855f7"`);
      nodeLines.push(`${indent}  style.stroke-width: 2`);
      nodeLines.push(`${indent}  style.font-color: "#e9d5ff"`);
    } else if (isDb) {
      nodeLines.push(`${indent}  style.fill: "#292524"`);
      nodeLines.push(`${indent}  style.stroke: "#f59e0b"`);
      nodeLines.push(`${indent}  style.stroke-width: 2`);
      nodeLines.push(`${indent}  style.font-color: "#fef3c7"`);
    } else {
      nodeLines.push(`${indent}  style.fill: "#134e4a"`);
      nodeLines.push(`${indent}  style.stroke: "#00AFA8"`);
      nodeLines.push(`${indent}  style.stroke-width: 1`);
      nodeLines.push(`${indent}  style.font-color: "#ccfbf1"`);
    }

    nodeLines.push(`${indent}}`);
    return nodeLines.join('\n');
  };

  if (hasMultipleLayers) {
    const groups = [
      { key: 'usecases', color: '#38bdf8', ...layerGroups.usecases },
      { key: 'services', color: '#00AFA8', ...layerGroups.services },
      { key: 'storage', color: '#f59e0b', ...layerGroups.storage },
      { key: 'other', color: '#818cf8', ...layerGroups.other },
    ];

    for (const g of groups) {
      if (g.nodes.length === 0) continue;
      lines.push(`${g.key}: "${g.name}" {`);
      lines.push(`  style.stroke: "${g.color}"`);
      lines.push('  style.stroke-dash: 3');
      lines.push('  style.fill: "transparent"');
      for (const node of g.nodes) {
        lines.push(renderNode(node, '  '));
      }
      lines.push('}\n');
    }
  } else {
    for (const node of diagram.nodes) {
      lines.push(renderNode(node, ''));
    }
    lines.push('');
  }

  // エッジ定義
  for (const edge of diagram.edges) {
    const fromGroup = hasMultipleLayers ? nodeToGroupMap.get(edge.from) : undefined;
    const toGroup = hasMultipleLayers ? nodeToGroupMap.get(edge.to) : undefined;

    const fromPrefix = fromGroup ? `${fromGroup}.` : '';
    const toPrefix = toGroup ? `${toGroup}.` : '';

    const fromId = `${fromPrefix}${sanitizeD2Id(edge.from)}`;
    const toId = `${toPrefix}${sanitizeD2Id(edge.to)}`;
    const labelPart = edge.label ? `: "${edge.label.replace(/"/g, '\\"')}"` : '';

    lines.push(`${fromId} -> ${toId}${labelPart} {`);
    lines.push('  style.stroke: "#58a6ff"');
    lines.push('  style.stroke-width: 2');
    lines.push('}');
  }

  return lines.join('\n');
}

function sanitizeD2Id(id: string): string {
  // D2 の識別子として安全な形式にエスケープ（英数字以外が含まれる場合はクォート）
  if (/^[a-zA-Z0-9_]+$/.test(id)) {
    return id;
  }
  return `"${id.replace(/"/g, '\\"')}"`;
}
