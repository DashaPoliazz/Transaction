"use strict";

// Interface definition
class Transaction {
  #id;

  constructor(data) {
    this.data = data;
    this.delta = {};
    this.events = {
      commit: {
        before: [],
        after: [],
      },
      rollback: {
        before: [],
        after: [],
      },
      revoke: {
        before: [],
        after: [],
      },
      set: {
        before: [],
        after: [],
      },
      get: {
        before: [],
        after: [],
      },
      timeout: {
        before: [],
        after: [],
      },
    };
    this.logs = [];

    this.#id = 0;

    this.#writeLog("started");
  }

  static start(data) {
    const transaction = new Transaction(data);

    const proxyObj = new Proxy(data, {
      get(target, key) {
        if (transaction.delta.hasOwnProperty(key))
          return transaction.delta[key];
        else return target[key];
      },
      set(_, key, value) {
        transaction.delta[key] = value;
        return true;
      },
    });

    return [proxyObj, transaction];
  }

  // [id, time, operation, delta];
  #writeLog(operation) {
    const time = new Date(Date.now()).toISOString();
    const delta = Object.assign({}, this.delta);
    const log = {
      id: this.#id++,
      time,
      operation,
      delta,
    };
    this.logs.push(log);
  }
  #runBefore(name, ...args) {
    const event = this.events[name];
    if (!event) return;
    const listeners = event["before"];
    listeners.forEach((cb) => cb(...args));
  }
  #runAfter(name, ...args) {
    const event = this.events[name];
    if (!event) return;
    const listeners = event["after"];
    listeners.forEach((cb) => cb(...args));
  }
  commit() {
    this.#writeLog("commit");
    this.#runBefore("commit");
    const keys = Object.keys(this.delta);
    keys.forEach((key) => (this.data[key] = this.delta[key]));
    this.#runAfter("commit");
    this.delta = {};
  }
  rollback() {
    this.#writeLog("rollback");
    this.#runBefore("rollback");
    this.delta = {};
    this.#runAfter("rollback");
  }
  revoke() {
    this.#writeLog("revoke");
    this.#runBefore("revoke");
    // Implement revoke logic here
    this.#runAfter("revoke");
  }
  timeout(msec) {
    this.#writeLog("timeout");
    this.#runBefore("timeout", msec);
    // Implement timeout logic here
    this.#runAfter("timeout", msec);
  }
  before(event, listener) {
    const events = this.events[event];
    events["before"].push(listener);
  }
  after(event, listener) {
    const events = this.events[event];
    events["after"].push(listener);
  }
  // Events: commit, rollback, revoke, set, get, timeout
}

// Usage

const data = { name: "Marcus Aurelius", born: 121 };

// obj<Proxy<O>>
const [obj, transaction] = Transaction.start(data);
console.dir({ data });

obj.name = "Mao Zedong";
obj.born = 1893;
obj.city = "Shaoshan";

console.dir({ obj });
console.dir({ delta: transaction.delta });

transaction.commit();
console.dir({ data });
console.dir({ obj });
console.dir({ delta: transaction.delta });

obj.born = 1976;
console.dir({ obj });
console.dir({ delta: transaction.delta });

transaction.rollback();
console.dir({ data });
console.dir({ obj });
console.dir({ delta: transaction.delta });
