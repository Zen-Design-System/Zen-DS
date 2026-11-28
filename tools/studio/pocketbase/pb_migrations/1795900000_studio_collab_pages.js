/// <reference path="../pb_data/types.d.ts" />

// Zen Studio collaboration, GĐ 2 (docs/research/studio-collaboration-plan-2026-11-07.md): a shared project's pages,
// photos, comments and theme saved in PocketBase. The rules of GĐ 1 hold: a seat to read anything, the project's owner
// and members read, and now its owner and Can edit members write its pages and photos, every member writes comments,
// only the owner changes its theme. Each save names the version it was made on (`base_version`) and a higher `version`:
// a save made on an older version is refused, so nobody overwrites another person's save without seeing it (the Studio
// keeps theirs in Version history and takes the newer one).
//
// "Editor" reads one member row: an aliased @collection join keeps the project, the email and the role on the same row
// (checked: a viewer is refused even when the project has another member who can edit).

const SEAT = "@collection.studio_seats.email ?= @request.auth.email"
const SIGNED_IN = '@request.auth.id != ""'
const MEMBER = "(project.owner = @request.auth.id || project.studio_members_via_project.email ?= @request.auth.email)"
const EDITOR = '(project.owner = @request.auth.id || (@collection.studio_members:me.project ?= project && @collection.studio_members:me.email ?= @request.auth.email && @collection.studio_members:me.role ?= "editor"))'
const READ = `${SIGNED_IN} && ${SEAT} && ${MEMBER}`
/** A save on the version it read, to a higher one, by the person signed in. */
const VERSIONED = "@request.body.base_version = version && @request.body.version > version"

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const projects = app.findCollectionByNameOrId("studio_projects")

  // The project's own settings (its theme, language, libraries: project-theme.mjs normalizeProject), written by its owner.
  projects.fields.add(new JSONField({ name: "data", maxSize: 2000000 }))
  app.save(projects)

  const pages = new Collection({
    name: "studio_pages",
    type: "base",
    listRule: READ,
    viewRule: READ,
    createRule: `${SIGNED_IN} && ${SEAT} && ${EDITOR} && @request.body.version = 1 && @request.body.updated_by = @request.auth.id`,
    updateRule: `${SIGNED_IN} && ${SEAT} && ${EDITOR} && ${VERSIONED} && @request.body.updated_by = @request.auth.id && @request.body.project:isset = false && @request.body.page_id:isset = false`,
    // A page goes to the Trash as a save (`trashed`); only the owner deletes one for good.
    deleteRule: `${SIGNED_IN} && project.owner = @request.auth.id`,
    fields: [
      { name: "project", type: "relation", required: true, collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
      // The page's id in its owner's Studio; its text names the owner's project id in its header.
      { name: "page_id", type: "text", required: true, max: 64 },
      { name: "title", type: "text", max: 300 },
      { name: "text", type: "text", max: 5000000 },
      { name: "version", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "base_version", type: "number", onlyInt: true },
      { name: "trashed", type: "bool" },
      { name: "updated_by", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
      { name: "updated_by_email", type: "email" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_pages_project_page ON studio_pages (project, page_id)"],
  })
  app.save(pages)

  const assets = new Collection({
    name: "studio_assets",
    type: "base",
    listRule: READ,
    viewRule: READ,
    createRule: `${SIGNED_IN} && ${SEAT} && ${EDITOR}`,
    updateRule: null,
    deleteRule: `${SIGNED_IN} && project.owner = @request.auth.id`,
    fields: [
      { name: "project", type: "relation", required: true, collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
      // The photo's id in the Studio (uploads.ts assetIdFor: name + content hash), so one photo is stored once.
      { name: "asset_id", type: "text", required: true, max: 200 },
      { name: "name", type: "text", max: 300 },
      { name: "file", type: "file", required: true, maxSelect: 1, maxSize: 26214400, protected: false },
      { name: "created", type: "autodate", onCreate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_assets_project_asset ON studio_assets (project, asset_id)"],
  })
  app.save(assets)

  const comments = new Collection({
    name: "studio_comments",
    type: "base",
    listRule: READ,
    viewRule: READ,
    // Everyone in the project comments, Can view members included (as Figma).
    createRule: `${READ} && @request.body.version = 1`,
    updateRule: `${READ} && ${VERSIONED} && @request.body.project:isset = false && @request.body.page_id:isset = false`,
    deleteRule: `${SIGNED_IN} && project.owner = @request.auth.id`,
    fields: [
      { name: "project", type: "relation", required: true, collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
      { name: "page_id", type: "text", required: true, max: 64 },
      { name: "data", type: "json", maxSize: 2000000 },
      { name: "version", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "base_version", type: "number", onlyInt: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_studio_comments_project_page ON studio_comments (project, page_id)"],
  })
  return app.save(comments)
}, (app) => {
  for (const name of ["studio_comments", "studio_assets", "studio_pages"]) app.delete(app.findCollectionByNameOrId(name))
  const projects = app.findCollectionByNameOrId("studio_projects")
  projects.fields.removeByName("data")
  return app.save(projects)
})
