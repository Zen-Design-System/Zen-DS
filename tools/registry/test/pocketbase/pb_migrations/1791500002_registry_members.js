/// <reference path="../pb_data/types.d.ts" />

// Seats: the registry counts a license's team members (owner + members, oldest first, up to max_members), so
// `registry_clients` may list and view `team_members`. Read-only; the owner's and member's own access is unchanged.
// The same change is applied to the live zen-license-management backend.
const LIST_BEFORE = "license.owner = @request.auth.id || user = @request.auth.id"
const LIST_AFTER = LIST_BEFORE + ' || @request.auth.collectionName = "registry_clients"'

migrate((app) => {
  const members = app.findCollectionByNameOrId("team_members")
  members.listRule = LIST_AFTER
  members.viewRule = LIST_AFTER
  return app.save(members)
}, (app) => {
  const members = app.findCollectionByNameOrId("team_members")
  members.listRule = LIST_BEFORE
  members.viewRule = LIST_BEFORE
  return app.save(members)
})
