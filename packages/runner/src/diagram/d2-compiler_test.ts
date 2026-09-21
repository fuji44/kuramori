import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { compileD2ToSvg, generateD2FromDiagram } from './d2-compiler.ts';
import type { Diagram } from '@review-base/core';

Deno.test('D2 Compiler - generates D2 code from Diagram data', () => {
  const diagram: Diagram = {
    nodes: [
      { id: 'NodeA', label: 'Service A', type: 'modified', severity: 'P1', commentId: 'C1' },
      { id: 'NodeB', label: 'Service B', type: 'dependency' },
    ],
    edges: [
      { from: 'NodeA', to: 'NodeB', label: 'calls' },
    ],
  };

  const d2Code = generateD2FromDiagram(diagram);
  assertStringIncludes(d2Code, 'NodeA: "Service A"');
  assertStringIncludes(d2Code, 'NodeB: "Service B"');
  assertStringIncludes(d2Code, 'NodeA -> NodeB: "calls"');
});

Deno.test('D2 Compiler - compiles D2 source to vector SVG', async () => {
  const d2Source = `
direction: right
Alpha: "Alpha Service"
Beta: "Beta Service"
Alpha -> Beta: "connects"
`;

  const svg = await compileD2ToSvg(d2Source, { layout: 'tala' });
  assertStringIncludes(svg, '<svg');
  assertStringIncludes(svg, 'Alpha Service');
  assertStringIncludes(svg, 'Beta Service');
  assertStringIncludes(svg, '</svg>');
});
