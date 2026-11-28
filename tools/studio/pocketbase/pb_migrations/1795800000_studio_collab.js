/// <reference path="../pb_data/types.d.ts" />

// Zen Studio collaboration, GĐ 1 (docs/research/studio-collaboration-plan-2026-11-07.md; user 2026-11-22: one editor per
// page, PocketBase cloud, only licence holders / seats sign in). Three collections, every access decided by the API
// rules so the server refuses, not only the UI:
//
//   studio_seats    who may use Studio's shared projects (filled by the developer from Polar; a person sees their own)
//   studio_projects a project shared from someone's Studio: its owner, its name and the owner's local project id
//   studio_members  who else is in it, by email, as Can edit (editor) or Can view (viewer); the owner is the project's
//
// Nothing here is applied by a Claude session: a developer imports it into the live instance (tools/studio/pocketbase/
// README.md). The pages, images and comments collections come with GĐ 2 (the cloud PageMirror), which uses them.

const SEAT = "@collection.studio_seats.email ?= @request.auth.email"
const SIGNED_IN = '@request.auth.id != ""'

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  const seats = new Collection({
    name: "studio_seats",
    type: "base",
    // A person can check their own seat; the list itself is the developer's (superusers only).
    listRule: `${SIGNED_IN} && email = @request.auth.email`,
    viewRule: `${SIGNED_IN} && email = @request.auth.email`,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "email", type: "email", required: true },
      { name: "note", type: "text", max: 200 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_seats_email ON studio_seats (email)"],
  })
  app.save(seats)

  const projects = new Collection({
    name: "studio_projects",
    type: "base",
    listRule: null,
    viewRule: null,
    // Only a seat holder shares a project, and only as its owner, under their own email.
    createRule: `${SIGNED_IN} && ${SEAT} && @request.body.owner = @request.auth.id && @request.body.owner_email = @request.auth.email`,
    // The owner renames it; the owner never changes.
    updateRule: `${SIGNED_IN} && ${SEAT} && owner = @request.auth.id && @request.body.owner:isset = false && @request.body.owner_email:isset = false`,
    deleteRule: `${SIGNED_IN} && owner = @request.auth.id`,
    fields: [
      { name: "name", type: "text", required: true, max: 200 },
      { name: "owner", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      // Members cannot read the owner's user record (users' own rules): the Share dialog names the owner by this.
      { name: "owner_email", type: "email", required: true },
      // The owner's own project id in their Studio (project-theme.mjs projectIdFor): one cloud project per local one.
      { name: "local_id", type: "text", required: true, max: 100 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_projects_owner_local ON studio_projects (owner, local_id)"],
  })
  app.save(projects)

  const members = new Collection({
    name: "studio_members",
    type: "base",
    // Everyone in a project sees who else is in it (Figma's Share dialog); a seat is needed to see anything.
    listRule: `${SIGNED_IN} && ${SEAT} && (project.owner = @request.auth.id || project.studio_members_via_project.email ?= @request.auth.email)`,
    viewRule: `${SIGNED_IN} && ${SEAT} && (project.owner = @request.auth.id || project.studio_members_via_project.email ?= @request.auth.email)`,
    // The owner invites, changes a role and removes; a member may leave (delete their own row).
    createRule: `${SIGNED_IN} && ${SEAT} && project.owner = @request.auth.id`,
    updateRule: `${SIGNED_IN} && ${SEAT} && project.owner = @request.auth.id && @request.body.project:isset = false && @request.body.email:isset = false`,
    deleteRule: `${SIGNED_IN} && (project.owner = @request.auth.id || email = @request.auth.email)`,
    fields: [
      { name: "project", type: "relation", required: true, collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
      { name: "email", type: "email", required: true },
      { name: "role", type: "select", required: true, maxSelect: 1, values: ["editor", "viewer"] },
      { name: "invited_by", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_members_project_email ON studio_members (project, email)"],
  })
  app.save(members)

  // A project is seen by its owner and its members (the back-relation exists once studio_members does).
  const shared = app.findCollectionByNameOrId("studio_projects")
  shared.listRule = `${SIGNED_IN} && ${SEAT} && (owner = @request.auth.id || studio_members_via_project.email ?= @request.auth.email)`
  shared.viewRule = shared.listRule
  return app.save(shared)
}, (app) => {
  for (const name of ["studio_members", "studio_projects", "studio_seats"]) {
    const collection = app.findCollectionByNameOrId(name)
    app.delete(collection)
  }
})
