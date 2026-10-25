/// <reference path="../pb_data/types.d.ts" />

// Phase 6: Polar payments create and switch licences (zen_polar.js has the logic and the rules).
// Deploy to zen-license-management: `pbc pocketbase hooks push tools/registry/pocketbase/pb_hooks`, with
// POLAR_WEBHOOK_SECRET set on the instance. Polar's webhook endpoint: <instance URL>/api/zen/billing/polar.
// PocketBase runs each handler in its own runtime, so every handler requires the module itself.

onBootstrap((e) => {
  e.next()
  require(`${__hooks}/zen_polar.js`).ensureCollection(e.app)
})

routerAdd("POST", "/api/zen/billing/polar", (e) => require(`${__hooks}/zen_polar.js`).handleWebhook(e))

// A paid subscription whose email had no verified account yet gets its licence when that account appears.
// Never blocks the sign-up: a failure is logged and the next update of the account tries again.
onRecordAfterCreateSuccess((e) => {
  e.next()
  try {
    require(`${__hooks}/zen_polar.js`).claim(e.app, e.record)
  } catch (err) {
    e.app.logger().error("polar claim failed", "user", e.record.id, "error", String(err))
  }
}, "users")

onRecordAfterUpdateSuccess((e) => {
  e.next()
  try {
    require(`${__hooks}/zen_polar.js`).claim(e.app, e.record)
  } catch (err) {
    e.app.logger().error("polar claim failed", "user", e.record.id, "error", String(err))
  }
}, "users")
