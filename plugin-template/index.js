// Triggerd plugin template — a single CommonJS module, no build step. The app evaluates it with
// (module, exports, host, React). Build UI with React.createElement so it shares the host's React.
// Types come from ../triggerd-plugin.d.ts via the JSDoc imports below (jsconfig.json enables checkJs).
//
// Iterate fast: edit this file, then Settings → Plugins → "Reload plugins" (no app relaunch).

/* global module, host, React */

/** @typedef {import('../triggerd-plugin').PluginHost} PluginHost */
/** @typedef {import('../triggerd-plugin').PluginNode} PluginNode */
/** @typedef {import('../triggerd-plugin').PlaybackContext} PlaybackContext */

// --- A node type: on enter, bumps a show variable and toasts the count. -------------------------

/** @param {{ node: PluginNode }} props */
function Card({ node }) {
  return React.createElement(
    'div',
    { className: 'spp-node-head' },
    React.createElement('span', { className: 'spp-node-name', title: node.name }, '✨ ' + (node.name || 'Template'))
  )
}

/** @param {import('../triggerd-plugin').NodeInspectorProps} props */
function Inspector({ node, updateData }) {
  const varName = String((node.data && node.data.varName) || 'count')
  return React.createElement(
    'label',
    { className: 'spp-field' },
    React.createElement('span', null, 'Variable name'),
    React.createElement('input', {
      type: 'text',
      value: varName,
      onChange: (e) => updateData({ varName: e.target.value })
    })
  )
}

/** @param {PluginHost} host */
function activate(host) {
  host.registerNodeType({
    id: 'example.template.bump',
    palette: { icon: '✨', label: 'Template node' },
    defaultData: () => ({ varName: 'count' }),
    card: Card,
    inspector: Inspector,
    ports: { input: true, output: true },
    /** @param {PluginNode} node @param {PlaybackContext} ctx */
    onEnter: (node, ctx) => {
      const name = String((node.data && node.data.varName) || 'count')
      const next = host.vars.get(name) + 1
      host.vars.set(name, next)
      ctx.log('template bump', name, '→', next)
      host.ui.toast(name + ' = ' + next)
    }
  })
}

/** @type {import('../triggerd-plugin').Plugin} */
module.exports = {
  id: 'example.template',
  name: 'Plugin Template',
  version: '1.0.0',
  apiVersion: 5,
  activate
}
