// @vitest-environment node
import { expect, it } from 'vitest';
import { weld3mfVertices } from './weld3mfVertices';

it('shares exact vertices without rounding nearby points or changing triangle properties', () => {
  const mesh = `<mesh><vertices>
    <vertex x="0" y="0" z="0"/>
    <vertex x="1" y="0" z="0"/>
    <vertex x="0" y="1" z="0"/>
    <vertex x="0.0" y="-0" z="0"/>
    <vertex x="0.000000001" y="0" z="0"/>
    </vertices><triangles><triangle v1="3" v2="2" v3="1" pid="7" p1="2"/>
    <triangle v1="0" v2="4" v3="2"/></triangles></mesh>`;
  const result = weld3mfVertices(mesh + mesh);
  expect(result.match(/<vertex\s/g)).toHaveLength(8);
  expect(result.match(/<triangle v1="0" v2="2" v3="1" pid="7" p1="2"\/>/g)).toHaveLength(2);
  expect(result.match(/<triangle v1="0" v2="3" v3="2"\/>/g)).toHaveLength(2);
  expect(result).toContain('x="0.000000001"');
  expect(weld3mfVertices(result)).toBe(result);
});

it('rejects invalid vertex references instead of emitting a corrupt mesh', () => {
  expect(() =>
    weld3mfVertices('<mesh><vertices></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh>')
  ).toThrow('Invalid 3MF triangle vertex reference');
});
