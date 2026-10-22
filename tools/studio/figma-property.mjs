// PropertyField's value cell ↔ Figma .Primitives/Input/Property-Value (16921:6022), the nested Value of
// Input/Property-Field (16923:6031): figma-push draws a cell as that Value's Type, State and content, figma-pull reads it
// back as the cell. BadgeStatus' status ↔ Figma Badge-Status Status. Isomorphic, no I/O.

/** PropertyField's value cells → the Value's Type. */
export const PROPERTY_TYPE = { PropertyText: "Text", PropertySelect: "Select", PropertyStatus: "Status", PropertyDate: "Date", PropertyPeople: "Person", PropertyTags: "Tags" };
const CELL_OF_TYPE = Object.fromEntries(Object.entries(PROPERTY_TYPE).map(([cell, type]) => [type, cell]));
export const PROPERTY_STATE = { default: "Default", inputted: "Inputted", hover: "Hover", editing: "Editing" };
/** BadgeStatus `status` ↔ Figma Badge-Status Status. */
export const BADGE_STATUS = { "to-do": "To Do", "in-progress": "In Progress", "in-review": "In Review", done: "Done", blocked: "Blocked", cancelled: "Cancelled" };
const STATUS_OF = Object.fromEntries(Object.entries(BADGE_STATUS).map(([code, figma]) => [figma, code]));

const titleCase = (value) => String(value).split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("-");
const slug = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** An ISO day ("2026-06-07") as PropertyDate shows it in English ("June 7, 2026"). */
export const propertyDay = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : null;
};
/** "June 7, 2026" → "2026-06-07" (the other way). */
export const isoDayOf = (text) => {
  const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(String(text ?? "").trim());
  const month = m ? MONTHS.indexOf(m[1]) : -1;
  return month < 0 ? null : `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
};

/**
 * A cell as Figma draws it: the nested Value takes the cell's Type and its State (`state`, else Inputted while it holds a
 * value, Default when empty), then the content in the Value's own layers — Text/Date/Select's Value text, Select's
 * Leading (Property-Icon Tone + icon), Status's Badge-Status, Person's Tag (the first person: Figma's cell holds one),
 * Tags' Tag-1/Tag-2 Badges (the first two; Tag-2 hidden for one). `props` are the cell's plain props.
 */
export function propertyValueFigma(name, props) {
  const type = PROPERTY_TYPE[name];
  const notes = [], hide = [];
  const value = props.value ?? props.defaultValue;
  const filled = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
  const state = PROPERTY_STATE[props.state] ?? (filled ? "Inputted" : "Default");
  const nested = [{ path: "Value", props: { Type: type, State: state } }];
  if (!filled) return { nested, hide, notes };
  const options = Array.isArray(props.options) ? props.options : [];
  const optionOf = (id) => options.find((option) => option?.value === id);
  const words = (label) => (typeof label === "string" ? label : "");
  if (name === "PropertyText") nested[0].texts = { Value: String(value) };
  else if (name === "PropertyDate") {
    const day = propertyDay(value);
    if (day) nested[0].texts = { Value: day }; else notes.push("its date is not an ISO day: Figma keeps the sample date");
  } else if (name === "PropertySelect") {
    const option = optionOf(value);
    if (option) {
      nested[0].texts = { Value: words(option.label) };
      if (option.icon) nested.push({ path: "Value/Leading", props: { Tone: titleCase(option.tone ?? "neutral") }, ...(typeof option.icon === "string" ? { swapIcon: option.icon } : {}) });
      else hide.push("Leading");
    }
  } else if (name === "PropertyStatus") {
    const label = props.labels && typeof props.labels[value] === "string" ? props.labels[value] : null;
    nested.push({ path: "Value/Status", props: { Status: BADGE_STATUS[value] ?? "To Do" }, ...(label ? { text: label } : {}) });
    if (typeof props.progress === "number") notes.push("progress (the ring's exact value) is the Progress layer's arc in Figma: not written");
  } else if (name === "PropertyPeople") {
    const people = value.map(optionOf).filter(Boolean);
    if (people[0]) nested.push({ path: "Value/Person", props: {}, text: words(people[0].label) });
    if (people.length > 1) notes.push(`${people.length} people: Figma's Person cell shows the first`);
  } else if (name === "PropertyTags") {
    const tags = value.map(optionOf).filter(Boolean);
    tags.slice(0, 2).forEach((tag, index) => nested.push({ path: `Value/Tag-${index + 1}`, props: { Theme: titleCase(tag.theme ?? "neutral") }, text: words(tag.label) }));
    if (tags.length === 1) hide.push("Tag-2");
    if (tags.length > 2) notes.push(`${tags.length} labels: Figma's Tags cell shows the first two`);
  }
  return { nested, hide, notes };
}

/**
 * A placed Input/Property-Field's value cell (figma-pull readInstance: `nested` — the instances the page changed — and
 * `texts`), as the cell element: its Type picks the component (Status when untouched, Figma's default), its State the
 * value or `state`, its layers the content (one option per shown value, named after its words).
 */
export function propertyValueElement(node, literal) {
  const notes = [];
  const nested = node.nested ?? [];
  const at = (path) => nested.find((entry) => entry.path === path);
  const value = at("Value");
  const type = value?.props?.Type ?? "Status";
  const state = value?.props?.State ?? "Inputted";
  const name = CELL_OF_TYPE[type] ?? "PropertyStatus";
  const props = {};
  if (state === "Hover" || state === "Editing") props.state = literal(state.toLowerCase());
  // The Value's text: a placed instance's changed text (readInstance `texts`), a pushed one's (`texts.Value`), else the
  // Value's first text.
  const text = (Array.isArray(node.texts) ? node.texts.find((entry) => entry.path === "Value" && entry.name === "Value")?.characters : null) ?? value?.texts?.Value ?? value?.text;
  const option = (label, extra = {}) => ({ kind: "object", fields: { value: literal(slug(label)), label: literal(label), ...Object.fromEntries(Object.entries(extra).map(([key, val]) => [key, literal(val)])) } });
  if (state !== "Default") {
    if (name === "PropertyText" && text) props.defaultValue = literal(text);
    else if (name === "PropertyDate" && text) {
      const iso = isoDayOf(text);
      if (iso) props.defaultValue = literal(iso); else notes.push(`its date "${text}" is not read as a day`);
    } else if (name === "PropertySelect" && text) {
      const lead = at("Value/Leading");
      const icon = nested.find((entry) => entry.path.startsWith("Value/Leading/") && entry.set?.name?.startsWith("icon-"))?.set?.name;
      props.defaultValue = literal(slug(text));
      props.options = { kind: "array", items: [option(text, { ...(icon ? { icon } : {}), ...(lead?.props?.Tone ? { tone: String(lead.props.Tone).toLowerCase() } : {}) })] };
    } else if (name === "PropertyStatus") {
      const status = at("Value/Status");
      props.defaultValue = literal(STATUS_OF[status?.props?.Status] ?? "to-do");
    } else if (name === "PropertyPeople") {
      const person = at("Value/Person")?.text;
      if (person) { props.defaultValue = { kind: "array", items: [literal(slug(person))] }; props.options = { kind: "array", items: [option(person)] }; }
    } else if (name === "PropertyTags") {
      const tags = ["Value/Tag-1", "Value/Tag-2"].map(at).filter((entry) => entry?.text);
      if (tags.length) {
        props.defaultValue = { kind: "array", items: tags.map((tag) => literal(slug(tag.text))) };
        props.options = { kind: "array", items: tags.map((tag) => option(tag.text, tag.props?.Theme ? { theme: String(tag.props.Theme).toLowerCase() } : {})) };
      }
    }
  }
  // Data a cell needs that Figma does not hold (the full option list) starts with what the cell shows.
  if ((name === "PropertySelect" || name === "PropertyPeople" || name === "PropertyTags") && !props.options) props.options = { kind: "array", items: [] };
  return { element: { kind: "element", name, props, children: [] }, notes };
}
