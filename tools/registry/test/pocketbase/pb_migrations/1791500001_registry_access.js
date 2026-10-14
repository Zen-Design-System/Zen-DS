/// <reference path="../pb_data/types.d.ts" />

// The registry's access to licenses: the change applied to the live zen-license-management backend.
// - `registry_clients`: an auth collection holding the one account the registry signs in as. All rules
//   null (superuser only), so nobody can sign up or read it through the API.
// - `licenses.viewRule`: the registry may read one license by id (listRule is unchanged, so it cannot
//   enumerate). The user part now requires a signed-in user: before, `team_members_via_license.user ?=
//   @request.auth.id` matched an anonymous request on any license without team members.
const VIEW_BEFORE = "owner.id = @request.auth.id || team_members_via_license.user ?= @request.auth.id\n"
const VIEW_AFTER =
  '@request.auth.id != "" && (owner.id = @request.auth.id || team_members_via_license.user ?= @request.auth.id)' +
  ' || @request.auth.collectionName = "registry_clients"'

migrate((app) => {
  const clients = new Collection({
    name: "registry_clients",
    type: "auth",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  })
  app.save(clients)

  const licenses = app.findCollectionByNameOrId("licenses")
  licenses.viewRule = VIEW_AFTER
  return app.save(licenses)
}, (app) => {
  const licenses = app.findCollectionByNameOrId("licenses")
  licenses.viewRule = VIEW_BEFORE
  app.save(licenses)
  return app.delete(app.findCollectionByNameOrId("registry_clients"))
})
