/// <reference path="../pb_data/types.d.ts" />

// A copy of the live `licenses` and `team_members` collections of zen-license-management (read with
// `pbc admin collections get` on 2026-10-08), so the e2e test runs against the real schema and rules.
// Test store only: never apply this to the live backend.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const licenses = new Collection({
    name: "licenses",
    type: "base",
    listRule: "owner.id = @request.auth.id\n",
    viewRule: null, // set below: it refers to team_members, which must exist first
    createRule: null,
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "owner", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
      { name: "type", type: "select", required: true, maxSelect: 1, values: ["business", "pro"] },
      { name: "credits_total", type: "number", required: true },
      { name: "credits_used", type: "number" },
      { name: "reset_day", type: "number", required: true },
      { name: "max_members", type: "number", required: true },
      { name: "purchase_date", type: "date", required: true },
      { name: "active", type: "bool" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(licenses)

  const members = new Collection({
    name: "team_members",
    type: "base",
    listRule: "license.owner = @request.auth.id || user = @request.auth.id",
    viewRule: "license.owner = @request.auth.id || user = @request.auth.id",
    fields: [
      { name: "license", type: "relation", required: true, collectionId: licenses.id, maxSelect: 1 },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
      { name: "added_by", type: "relation", collectionId: users.id, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(members)

  licenses.viewRule = "owner.id = @request.auth.id || team_members_via_license.user ?= @request.auth.id\n"
  return app.save(licenses)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("team_members"))
  return app.delete(app.findCollectionByNameOrId("licenses"))
})
