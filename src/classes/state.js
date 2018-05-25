import { Emitter } from '@picabia/picabia';

class State {
  constructor (transitions) {
    this._transitions = transitions;
    this._current = null;
    this._states = {};
    this._changingTo = false;

    this._emitter = new Emitter();
    Emitter.mixin(this, this._emitter);
  }

  _canDeactivate (nextState) {
    return Promise.resolve().then(() => {
      return this._current && this._current.state.canDeactivate && this._current.state.canDeactivate(nextState);
    });
  }

  _canActivate (nextState, args) {
    return this._states[nextState].canActivate && this._states[nextState].canActivate(...args);
  }

  _deactivate (nextState) {
    let promise;
    if (this._current && this._current.state.deactivate) {
      promise = this._current.state.deactivate(nextState);
    }
    return Promise.resolve(promise).then(() => {
      if (this._current) {
        this._emitter.emit('state-deactivated', this._current.state);
      }
    });
  }

  _createState (name) {
    if (!this._states[name].state) {
      const fn = this._states[name].fn;
      const state = fn();
      const done = this._states[name]._done = () => {
        this._emitter.emit('state-done', state);
      };
      state.on('done', done);
      this._emitter.emit('state-created', state);
      this._states[name].state = state;
    }
    return this._states[name];
  }

  _activate (nextState, args) {
    const next = this._createState(nextState);
    const promise = next.state.activate(...args);
    return Promise.resolve(promise)
      .then(() => {
        this._current = next;
        this._emitter.emit('state-activated', this._current.state);
      });
  }

  // -- api

  add (name, fn, canActivate) {
    canActivate = typeof canActivate === 'function' ? canActivate : null;
    this._states[name] = {
      name,
      fn,
      canActivate,
      state: null
    };
  }

  activate (nextState, ...args) {
    if (this._changingTo) {
      throw new Error(`Already in a state transition to ${this._changingTo}`);
    }
    this._changingTo = nextState;

    const previousState = this._current && this._current.name;

    if (!this._states[nextState]) {
      throw new Error(`Invalid state ${nextState}`);
    }

    const fromStates = this._transitions[nextState];
    if (fromStates && fromStates.indexOf(previousState) === -1) {
      throw new Error(`Invalid state transition from ${previousState} to ${nextState}`);
    }

    return this._canDeactivate(nextState)
      .then(() => this._canActivate(nextState))
      .then(() => this._deactivate(nextState))
      .then(() => this._activate(nextState, args))
      .then(() => {
        this._changingTo = false;
      });
  }

  destroy () {
    for (let name in this._states) {
      if (this._states[name].state) {
        const state = this._states[name].state;
        state.off('done', this._states[name]._done);
        this._emitter.emit('destroy', state);
        delete this._states[name];
      }
    }
    this._emitter.destroy();
  }
}

export {
  State
};
