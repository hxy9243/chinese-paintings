import * as THREE from "three";

// Shared geometry keeps a fully articulated crowd inexpensive to render.
export function createCrowd(
  parent: THREE.Group,
  prototype: (variant: number) => THREE.Group,
) {
  const templates = Array.from({ length: 3 }, (_, i) => prototype(i));
  const pools: {
    source: THREE.Mesh | THREE.Line;
    nodes: THREE.Object3D[];
    attribute?: THREE.InstancedBufferAttribute;
  }[] = [];
  const templatePools = new Map<THREE.Object3D, (typeof pools)[number]>();
  templates.forEach((t) =>
    t.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line) {
        const pool = { source: n, nodes: [] };
        pools.push(pool);
        templatePools.set(n, pool);
      }
    }),
  );
  const actors: THREE.Group[] = [];
  return {
    add(owner: THREE.Object3D, variant: number, name: string) {
      function copy(source: THREE.Object3D): THREE.Object3D {
        const node = new THREE.Group();
        node.name = source.name;
        node.position.copy(source.position);
        node.quaternion.copy(source.quaternion);
        node.scale.copy(source.scale);
        templatePools.get(source)?.nodes.push(node);
        source.children.forEach((child) => node.add(copy(child)));
        return node;
      }
      const actor = copy(templates[variant % 3]) as THREE.Group;
      actor.name = name;
      owner.add(actor);
      actors.push(actor);
      return actor;
    },
    finish() {
      pools.forEach((pool) => {
        const geo = new THREE.InstancedBufferGeometry().copy(
          pool.source.geometry as THREE.InstancedBufferGeometry,
        );
        geo.instanceCount = pool.nodes.length;
        const attr = new THREE.InstancedBufferAttribute(
          new Float32Array(pool.nodes.length * 16),
          16,
        ).setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute("crowdMatrix", attr);
        pool.attribute = attr;
        const material = (pool.source.material as THREE.ShaderMaterial).clone();
        material.uniforms = (
          pool.source.material as THREE.ShaderMaterial
        ).uniforms;
        material.vertexShader =
          "attribute mat4 crowdMatrix;\n" +
          material.vertexShader
            .replace(
              "modelMatrix*vec4(position,1.)",
              "modelMatrix*crowdMatrix*vec4(position,1.)",
            )
            .replace(
              "mat3(modelMatrix)*normal",
              "mat3(modelMatrix*crowdMatrix)*normal",
            );
        const drawable =
          pool.source instanceof THREE.Line
            ? new THREE.LineSegments(geo, material)
            : new THREE.Mesh(geo, material);
        drawable.name = "animated-crowd";
        drawable.frustumCulled = false;
        parent.add(drawable);
      });
      templates.forEach((t) =>
        t.traverse((n) => {
          if (n instanceof THREE.Mesh || n instanceof THREE.Line)
            n.geometry.dispose();
        }),
      );
    },
    update() {
      parent.updateMatrixWorld(true);
      const inverse = parent.matrixWorld.clone().invert(),
        matrix = new THREE.Matrix4();
      pools.forEach((pool) => {
        pool.nodes.forEach((node, i) => {
          let visible = true;
          for (let p: THREE.Object3D | null = node; p; p = p.parent)
            visible = visible && p.visible;
          matrix.multiplyMatrices(inverse, node.matrixWorld);
          if (!visible) matrix.makeScale(0, 0, 0);
          matrix.toArray(pool.attribute!.array, i * 16);
        });
        pool.attribute!.needsUpdate = true;
      });
    },
    actors,
  };
}
