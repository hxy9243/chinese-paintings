import * as THREE from "three";
import { person } from "./bridgeStudy";
import { FIGURE_TYPES } from "./figureTypes";
import {
  bridgeActivity,
  bridgeVariant,
  type BridgeRole,
} from "./bridgeActivity";
const host = document.querySelector<HTMLElement>("#figures")!,
  labels = host.querySelector<HTMLElement>(".labels")!;
const names = [
  "商贩",
  "脚夫",
  "书生",
  "船工",
  "旅人",
  "店主",
  "妇人",
  "老者",
  "孩童",
  "工匠",
  "侍从",
  "提篮人",
];
let focus = -1,
  turn = 0.75,
  lastTime = 0;
let activity: BridgeRole | "walking" = "walking";
const actionIndex = {
  "river-watcher": 0,
  vendor: 2,
  customer: 4,
  conversation: 6,
};
const actionSelect =
  document.querySelector<HTMLSelectElement>("#activity-choice")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xeee5cb);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
host.prepend(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.OrthographicCamera(-3.6, 3.6, 1.05, -1.05, 0.1, 30);
const figures = FIGURE_TYPES.map((_, i) => {
  const p = person(new THREE.Group(), i, true, 2);
  scene.add(p);
  return p;
});
const restArms = figures.map((p) => ({
  left: p.getObjectByName("left-arm")!.rotation.z,
  right: p.getObjectByName("right-arm")!.rotation.z,
}));
const select = document.querySelector<HTMLSelectElement>("#figure-choice")!;
FIGURE_TYPES.forEach((p, i) => {
  const label = document.createElement("button");
  label.textContent = names[i];
  const small = document.createElement("small");
  small.textContent = p.name;
  label.append(small);
  labels.append(label);
  label.addEventListener("click", () => choose(i));
  const option = document.createElement("option");
  option.value = String(i);
  option.textContent = names[i];
  select.append(option);
});
function choose(index: number) {
  activity = "walking";
  actionSelect.value = "walking";
  focus = index;
  select.value = String(index);
  labels.hidden = focus >= 0;
  layout();
  render(lastTime);
}
select.addEventListener("change", () => choose(Number(select.value)));
function chooseActivity(value: BridgeRole | "walking") {
  activity = value;
  actionSelect.value = value;
  if (value !== "walking") {
    focus = bridgeVariant(actionIndex[value]);
    select.value = String(focus);
    labels.hidden = true;
    layout();
  }
}
actionSelect.addEventListener("change", () => {
  chooseActivity(actionSelect.value as BridgeRole | "walking");
  render(lastTime);
});
document.querySelectorAll<HTMLButtonElement>("[data-turn]").forEach((button) =>
  button.addEventListener("click", () => {
    turn = Number(button.dataset.turn);
    document
      .querySelectorAll("[data-turn]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    render(lastTime);
  }),
);
function layout() {
  const single = focus >= 0,
    aspect = host.clientWidth / host.clientHeight;
  camera.left = single ? -0.43 * aspect : -3.6;
  camera.right = -camera.left;
  camera.top = single ? 0.43 : 1.05;
  camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
  camera.position.set(0, single ? 0.65 : 1.6, 8);
  camera.lookAt(0, single ? 0.05 : 0.1, 0);
  figures.forEach((p, i) => {
    p.visible = !single || i === focus;
    p.position.set(
      single ? 0 : ((i % 6) - 2.5) * 1.2,
      single ? -0.28 : 0.44 - Math.floor(i / 6) * 1.12,
      0,
    );
  });
}
function render(
  seconds: number,
  options: {
    focus?: number;
    turn?: number;
    activity?: BridgeRole | "walking";
  } = {},
) {
  if (options.focus !== undefined) {
    focus = options.focus;
    labels.hidden = focus >= 0;
    select.value = String(focus);
    layout();
  }
  if (options.activity !== undefined) chooseActivity(options.activity);
  if (options.turn !== undefined) turn = options.turn;
  lastTime = seconds;
  figures.forEach((p, i) => {
    const profile = FIGURE_TYPES[i],
      phase = seconds * 3 + i * 0.7,
      holding = ["ledger", "scroll", "tray"].includes(profile.load),
      loaded = profile.load === "baskets";
    p.rotation.y = turn;
    p.getObjectByName("left-arm")!.rotation.z = restArms[i].left;
    p.getObjectByName("right-arm")!.rotation.z = restArms[i].right;
    p.getObjectByName("torso")!.rotation.set(0, 0, 0);
    p.getObjectByName("left-forearm")!.rotation.set(0, 0, 0);
    p.getObjectByName("right-forearm")!.rotation.set(0, 0, 0);
    p.getObjectByName("left-leg")!.rotation.x = Math.sin(phase) * 0.2;
    p.getObjectByName("right-leg")!.rotation.x = -Math.sin(phase) * 0.2;
    p.getObjectByName("left-arm")!.rotation.x = holding
      ? -0.12
      : loaded
        ? -0.22
        : -Math.sin(phase) * 0.15;
    p.getObjectByName("right-arm")!.rotation.x = holding
      ? -0.12
      : loaded
        ? 0.015
        : Math.sin(phase) * 0.15;
    p.getObjectByName("head")!.rotation.set(
      0,
      Math.sin(seconds * 0.4 + i) * 0.08,
      0,
    );
    if (activity !== "walking") {
      const a = bridgeActivity(actionIndex[activity], seconds, 9243);
      p.getObjectByName("torso")!.rotation.set(a.torso, a.twist, 0);
      p.getObjectByName("left-arm")!.rotation.set(a.leftArm, 0, a.leftSpread);
      p.getObjectByName("right-arm")!.rotation.set(
        a.rightArm,
        0,
        a.rightSpread,
      );
      p.getObjectByName("left-forearm")!.rotation.x = a.leftElbow;
      p.getObjectByName("right-forearm")!.rotation.x = a.rightElbow;
      p.getObjectByName("head")!.rotation.set(a.headPitch, a.headTurn, 0);
      p.getObjectByName("left-leg")!.rotation.x = 0;
      p.getObjectByName("right-leg")!.rotation.x = 0;
    }
  });
  renderer.render(scene, camera);
}
function resize() {
  renderer.setSize(host.clientWidth, host.clientHeight);
  layout();
  render(lastTime);
}
new ResizeObserver(resize).observe(host);
resize();
(window as unknown as { figureStudy: unknown }).figureStudy = {
  frame: render,
  types: FIGURE_TYPES.map((p) => p.name),
};
if (!new URLSearchParams(location.search).has("capture")) {
  const animate = (t: number) => {
    render(t / 1000);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
