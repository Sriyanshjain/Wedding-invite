import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as core from '../dist/invitation-core.mjs';
const runtimeRequire = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/package.json')
  : createRequire(import.meta.url);
const { createCanvas } = runtimeRequire('@napi-rs/canvas');
const source = fs.readFileSync(new URL('../dist/script.js', import.meta.url), 'utf8').replace(/^import .*?;\s*/u, '');

// This is a canvas/DOM integration harness, not a browser layout test.
function setup(hash = '', reducedMotion = false) {
  const timers = [];
  const intervals = [];
  let clock = 0;
  let document;
  class Element {
    constructor(fragment = false) {
      this.hidden = false; this.children = []; this.attributes = new Map(); this.events = new Map();
      this.fragment = fragment; this.textContent = ''; this.classes = new Set();
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name) };
      this.style = { setProperty() {} };
    }
    addEventListener(name, handler) { this.events.set(name, handler); }
    fire(name, extra = {}) { this.events.get(name)?.({ pointerId: 1, pointerType: 'mouse', button: 0, preventDefault() {}, ...extra }); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    getAttribute(name) { return this.attributes.get(name); }
    appendChild(child) { this.children.push(...(child.fragment ? child.children : [child])); }
    replaceChildren() { this.children = []; }
    focus() { document.activeElement = this; }
    setPointerCapture() {}
    scrollIntoView() { this.scrolledIntoView = true; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 440 }; }
  }
  const ids = ['envelope-stage','open-envelope','invitation-pages','envelope-instruction','music-toggle','welcome-title','scratch-canvas','scratch-card','date-content','scratch-hint','scratch-progress','countdown-wrap','countdown-title','confetti-layer','copy-hashtag','copy-status','petals','music-label','reception','venue','couple-title','vadhu-aagman','music-status','wedding-audio'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  const raster = createCanvas(800, 440);
  Object.assign(nodes['scratch-canvas'], { width: 800, height: 440, getContext: () => raster.getContext('2d') });
  const audio = nodes['wedding-audio'];
  Object.assign(audio, { paused: true, playCalls: 0, pauseCalls: 0, currentTime: 0,
    play() { this.playCalls++; this.paused = false; return Promise.resolve(); },
    pause() { this.pauseCalls++; this.paused = true; }
  });
  nodes['invitation-pages'].hidden = true;
  nodes['music-toggle'].hidden = true;
  nodes['countdown-wrap'].hidden = true;
  nodes['date-content'].setAttribute('aria-hidden', 'true');
  const units = Object.fromEntries(['days','hours','minutes','seconds'].map(unit => [unit, new Element()]));
  const documentEvents = new Map();
  document = {
    activeElement: null, hidden: false, body: new Element(),
    getElementById: id => { assert.ok(nodes[id], `Unknown DOM id: ${id}`); return nodes[id]; },
    querySelector: selector => units[selector.match(/data-unit="(.*?)"/)?.[1]],
    createElement: () => new Element(), createDocumentFragment: () => new Element(true), addEventListener(name, handler) { documentEvents.set(name, handler); }
  };
  document.body.classList.add('sealed');
  const window = {
    location: { hash }, innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (handler, delay) => { timers.push({ handler, delay }); return timers.length; },
    setInterval: handler => { intervals.push(handler); return intervals.length; }, scrollTo() {}
  };
  let onNamesVisible;
  let observerDisconnected = false;
  window.IntersectionObserver = class {
    constructor(callback) { onNamesVisible = callback; }
    observe(target) { assert.equal(target, nodes['couple-title']); }
    disconnect() { observerDisconnected = true; }
  };
  vm.runInNewContext(source, {
    ...core, window, document, navigator: {}, performance: { now: () => (clock += 200) },
    clearTimeout() {}, clearInterval() {}, setTimeout: window.setTimeout, setInterval: window.setInterval, Math, Date
  });
  function stroke(y) {
    const node = nodes['scratch-canvas'];
    node.fire('pointerdown', { clientX: 0, clientY: y });
    node.fire('pointermove', { clientX: 800, clientY: y });
    node.fire('pointerup', { clientX: 800, clientY: y });
  }
  return { nodes, units, timers, intervals, document, stroke, onNamesVisible, disconnected: () => observerDisconnected, audio, documentEvents };
}

test('the invitation stays sealed until the opening animation and then exposes all pages', () => {
  const { nodes, timers, document } = setup();
  assert.equal(nodes['invitation-pages'].hidden, true);
  nodes['open-envelope'].fire('click');
  assert.equal(nodes['invitation-pages'].hidden, true);
  assert.equal(nodes['open-envelope'].disabled, true);
  assert.equal(nodes.petals.children.length, 14);
  assert.equal(nodes['envelope-stage'].classList.contains('envelope-opening'), true);
  timers.find(timer => timer.delay === 1600).handler();
  assert.equal(nodes['invitation-pages'].hidden, false);
  assert.equal(document.body.classList.contains('sealed'), false);
  timers.find(timer => timer.delay === 500).handler();
  assert.equal(nodes['envelope-stage'].hidden, true);
  assert.equal(document.activeElement, nodes['welcome-title']);
});
test('repeated scratches on the same small area do not reveal the dates early', () => {
  const { nodes, stroke } = setup();
  for (let repeat = 0; repeat < 12; repeat++) stroke(100);
  assert.equal(nodes['scratch-card'].classList.contains('revealed'), false);
  assert.equal(nodes['countdown-wrap'].hidden, true);
  assert.equal(nodes['date-content'].getAttribute('aria-hidden'), 'true');
});
test('erasing 70% reveals the entire date, produces confetti once, and starts the countdown', () => {
  const { nodes, units, stroke, intervals } = setup();
  for (const row of [45, 140, 235, 330]) stroke(row);
  assert.equal(nodes['scratch-card'].classList.contains('revealed'), true, nodes['scratch-progress'].textContent);
  assert.equal(nodes['date-content'].getAttribute('aria-hidden'), undefined);
  assert.equal(nodes['countdown-wrap'].hidden, false);
  assert.match(nodes['scratch-hint'].textContent, /27 & 28 November 2026/);
  assert.match(units.days.textContent, /^\d+$/);
  assert.equal(intervals.length, Date.now() < core.WEDDING_START ? 1 : 0);
  assert.equal(nodes['confetti-layer'].children.length, 120);
  nodes['scratch-canvas'].fire('keydown', { key: 'Enter' });
  assert.equal(nodes['confetti-layer'].children.length, 120);
});
test('keyboard guests can reveal the same card without needing a pointer gesture', () => {
  const { nodes } = setup();
  nodes['scratch-canvas'].focus();
  nodes['scratch-canvas'].fire('keydown', { key: 'Enter' });
  assert.equal(nodes['scratch-card'].classList.contains('revealed'), true);
  assert.equal(nodes['countdown-wrap'].hidden, false);
  assert.equal(nodes['scratch-canvas'].getAttribute('aria-hidden'), 'true');
  assert.equal(nodes['date-content'].getAttribute('aria-hidden'), undefined);
});


test('a direct reception link lands on Baraat after the envelope opens', () => {
  const { nodes, timers, document } = setup('#reception');
  nodes['open-envelope'].fire('click');
  timers.find(timer => timer.delay === 1600).handler();
  timers.find(timer => timer.delay === 500).handler();
  assert.equal(nodes.reception.scrolledIntoView, true);
  assert.equal(document.activeElement, nodes.reception);
});


test('a direct venue link lands on Where We Celebrate after opening the envelope', () => {
  const { nodes, timers, document } = setup('#venue');
  nodes['open-envelope'].fire('click');
  timers.find(timer => timer.delay === 1600).handler();
  timers.find(timer => timer.delay === 500).handler();
  assert.equal(nodes.venue.scrolledIntoView, true);
  assert.equal(document.activeElement, nodes.venue);
});

test('the writing waits for the couple heading and runs once when it is visible', () => {
  const { nodes, onNamesVisible, disconnected } = setup();
  const heading = nodes['couple-title'];
  assert.equal(heading.classList.contains('names-pending'), true);
  onNamesVisible([{isIntersecting: false, intersectionRatio: 0}]);
  assert.equal(heading.classList.contains('names-writing'), false);
  onNamesVisible([{isIntersecting: true, intersectionRatio: 0.5}]);
  assert.equal(heading.classList.contains('names-pending'), false);
  assert.equal(heading.classList.contains('names-writing'), true);
  assert.equal(disconnected(), true);
});
test('reduced-motion visitors see the names immediately without writing animation', () => {
  const { nodes } = setup('', true);
  assert.equal(nodes.petals.children.length, 0);
  assert.equal(nodes['couple-title'].classList.contains('names-pending'), false);
  assert.equal(nodes['couple-title'].classList.contains('names-writing'), false);
});

test('a direct Vadhu Aagman link lands on the new page after opening', () => {
  const { nodes, timers, document } = setup('#vadhu-aagman');
  nodes['open-envelope'].fire('click');
  timers.find(timer => timer.delay === 1600).handler();
  timers.find(timer => timer.delay === 500).handler();
  assert.equal(nodes['vadhu-aagman'].scrolledIntoView, true);
  assert.equal(document.activeElement, nodes['vadhu-aagman']);
});

test('the scratch card has maroon pigment and soft ink edges without obscuring the revealed centre', () => {
  const { nodes, stroke } = setup();
  const ctx = nodes['scratch-canvas'].getContext('2d');
  const [red, green, blue, alpha] = ctx.getImageData(400, 40, 1, 1).data;
  assert.equal(alpha, 255);
  assert.ok(red > green * 1.5 && blue > green);
  stroke(220);
  assert.equal(ctx.getImageData(400, 220, 1, 1).data[3], 0);
  const edgeAlpha = ctx.getImageData(400, 267, 1, 1).data[3];
  assert.ok(edgeAlpha > 0 && edgeAlpha < 255, `Expected feathered ink edge, got ${edgeAlpha}`);
});


test('the uploaded audio starts on the envelope tap and reports confirmed playback', () => {
  const { nodes, audio } = setup();
  assert.equal(audio.playCalls, 0);
  nodes['open-envelope'].fire('click');
  assert.equal(audio.playCalls, 1);
  assert.equal(audio.volume, 0.35);
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'false');
  audio.fire('playing');
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'true');
});
test('the small music button pauses and resumes without resetting the track', () => {
  const { nodes, audio } = setup();
  nodes['open-envelope'].fire('click'); audio.fire('playing');
  audio.currentTime = 12;
  nodes['music-toggle'].fire('click');
  assert.equal(audio.paused, true);
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'false');
  nodes['music-toggle'].fire('click');
  assert.equal(audio.playCalls, 2);
  assert.equal(audio.currentTime, 12);
});
test('a blocked play request leaves the music button available for a manual retry', async () => {
  const { nodes, audio } = setup();
  audio.play = () => Promise.reject(Object.assign(new Error('gesture required'), { name: 'NotAllowedError' }));
  nodes['open-envelope'].fire('click');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodes['music-toggle'].hidden, false);
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'false');
  assert.match(nodes['music-status'].textContent, /Tap the music button/);
});
test('audio failure does not prevent opening the invitation', () => {
  const { nodes, timers, audio } = setup();
  nodes['open-envelope'].fire('click'); audio.fire('error');
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'false');
  assert.match(nodes['music-status'].textContent, /unavailable/);
  timers.find(t => t.delay === 1600).handler();
  assert.equal(nodes['invitation-pages'].hidden, false);
});
test('leaving the tab pauses the music and a delayed playing event cannot restart it', () => {
  const { nodes, audio, document, documentEvents } = setup();
  nodes['open-envelope'].fire('click'); audio.fire('playing');
  document.hidden = true; documentEvents.get('visibilitychange')();
  assert.equal(audio.paused, true);
  audio.fire('playing');
  assert.equal(audio.paused, true);
  assert.equal(nodes['music-toggle'].getAttribute('aria-pressed'), 'false');
});
test('a cancelled play request cannot replace the paused state with a stale failure', async () => {
  const { nodes, audio } = setup();let reject;
  audio.play = () => new Promise((resolve, fail) => { reject = fail; });
  nodes['open-envelope'].fire('click');nodes['music-toggle'].fire('click');
  reject(Object.assign(new Error('cancelled'), {name:'NotAllowedError'}));
  await Promise.resolve();await Promise.resolve();
  assert.equal(nodes['music-status'].textContent, 'Music paused');
});
