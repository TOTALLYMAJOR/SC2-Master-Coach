const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const nodes = new Map();
const listeners = new Map();
let observerCallback = null;
let observing = false;
let pendingMutations = 0;

function queueChildMutation() {
  if (observing) pendingMutations += 1;
}

class FakeNode {
  constructor(tagName) {
    this.tagName = tagName;
    this.id = "";
    this.type = "";
    this.title = "";
    this.className = "";
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value);
    queueChildMutation();
  }

  get textContent() {
    return this._textContent;
  }

  addEventListener() {}
}

const host = {
  prepend(node) {
    nodes.set(node.id, node);
    queueChildMutation();
  },
};

const document = {
  readyState: "loading",
  documentElement: {},
  head: {
    appendChild(node) {
      nodes.set(node.id, node);
      queueChildMutation();
    },
  },
  createElement(tagName) {
    return new FakeNode(tagName);
  },
  getElementById(id) {
    return nodes.get(id) || null;
  },
  querySelector(selector) {
    return selector === "#v110HudShell .v110-rail-operator" ? host : null;
  },
  addEventListener(type, callback) {
    listeners.set(type, callback);
  },
};

class FakeMutationObserver {
  constructor(callback) {
    observerCallback = callback;
  }

  observe() {
    observing = true;
  }
}

global.document = document;
global.MutationObserver = FakeMutationObserver;
global.fetch = () => new Promise(() => {});
global.window = {
  SC2StrategyEngine: {},
  SC2StrategyCompilerData: {},
  addEventListener() {},
};

const sourcePath = path.resolve(__dirname, "../../static/v111-python-shadow.js");
vm.runInThisContext(fs.readFileSync(sourcePath, "utf8"), { filename: sourcePath });
listeners.get("DOMContentLoaded")();

let observerTurns = 0;
while (pendingMutations > 0 && observerTurns < 25) {
  pendingMutations -= 1;
  observerCallback();
  observerTurns += 1;
}

if (pendingMutations > 0) {
  throw new Error(`Python Shadow observer did not quiesce after ${observerTurns} turns`);
}

process.stdout.write(`Python Shadow observer quiesced after ${observerTurns} turns\n`);
