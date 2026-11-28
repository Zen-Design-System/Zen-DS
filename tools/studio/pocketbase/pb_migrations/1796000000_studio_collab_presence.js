/// <reference path="../pb_data/types.d.ts" />

// Zen Studio collaboration, GĐ 3 (docs/research/studio-collaboration-plan-2026-11-07.md): seeing each other. One row per
// person on a page of a shared project: who they are, whether they hold the page's soft lock (`editing`), and when they
// were last there (`seen`, epoch ms, renewed every 15 s; a row older than 45 s is someone who left). Everyone in the
// project reads the rows (avatars in the top bar, "Bích is editing this page"); a person writes and removes only their own.
// Realtime: the Studio subscribes to studio_pages and studio_presence; the API rules below decide what each subscriber
// receives, as for a list.

const SEAT = "@collection.studio_seats.email ?= @request.auth.email"
const SIGNED_IN = '@request.auth.id != ""'
const MEMBER = "(project.owner = @request.auth.id || project.studio_members_via_project.email ?= @request.auth.email)"
const READ = `${SIGNED_IN} && ${SEAT} && ${MEMBER}`

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const projects = app.findCollectionByNameOrId("studio_projects")
  const presence = new Collection({
    name: "studio_presence",
    type: "base",
    listRule: READ,
    viewRule: READ,
    createRule: `${READ} && @request.body.user = @request.auth.id && @request.body.email = @request.auth.email`,
    updateRule: `${READ} && user = @request.auth.id && @request.body.user:isset = false && @request.body.email:isset = false && @request.body.project:isset = false && @request.body.page_id:isset = false`,
    deleteRule: `${SIGNED_IN} && user = @request.auth.id`,
    fields: [
      { name: "project", type: "relation", required: true, collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
      { name: "page_id", type: "text", required: true, max: 64 },
      { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: "email", type: "email", required: true },
      { name: "name", type: "text", max: 200 },
      { name: "editing", type: "bool" },
      { name: "seen", type: "number", required: true, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_presence_page_user ON studio_presence (project, page_id, user)"],
  })
  return app.save(presence)
}, (app) => app.delete(app.findCollectionByNameOrId("studio_presence")))
