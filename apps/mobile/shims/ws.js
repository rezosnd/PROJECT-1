// shims/ws.js
// Provides a lightweight WebSocket shim for React Native
// that wraps the global WebSocket (provided by RN's runtime)
// so that engine.io-client's websocket.node.js transport works.

class WebSocketShim {
  constructor(url, protocols, options) {
    this._ws = new WebSocket(url, protocols);
    this.readyState = WebSocket.CONNECTING;

    this._ws.onopen = (evt) => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen(evt);
    };
    this._ws.onmessage = (evt) => {
      if (this.onmessage) this.onmessage(evt);
    };
    this._ws.onerror = (evt) => {
      if (this.onerror) this.onerror(evt);
    };
    this._ws.onclose = (evt) => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) this.onclose(evt);
    };
  }

  send(data, opts, cb) {
    this._ws.send(data);
    if (typeof cb === 'function') cb();
  }

  close(code, reason) {
    this._ws.close(code, reason);
  }

  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }
}

module.exports = { WebSocket: WebSocketShim };

