import { Fragment, useId } from "react";
import { Avatar, Box, Grid, Heading, List, ListBox, ListItem } from "@zen-ds/react";
import { activity, formatDue, formatRelative, initials, people, tasks, type Person } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
/** A row caption of whole values: it wraps between values, never inside a key or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

/** The three open tasks due first. */
const openTasks = tasks.filter((task) => task.status !== "Done").sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 3);

// headingLevel: the box titles' level, one below the heading above them: 4 under a section's heading, 2 right under the
// screen's title (h1), as on the phone.
export default function TasksAndActivity({ headingLevel = 4 }: { headingLevel?: 2 | 4 }) {
  const tasksId = useId();
  const activityId = useId();
  return (
    // Desktop and tablet: the open tasks beside what changed; a phone keeps only the tasks.
    <Grid columns={{ mobile: 1, desktop: "minmax(0, 3fr) minmax(0, 2fr)" }} gap="lg" align="start">
      <ListBox as="section" theme="default" aria-labelledby={tasksId} header={<Heading level={headingLevel} id={tasksId} textStyle="Heading/Subheading">Open tasks</Heading>}>
        <List aria-labelledby={tasksId}>
          {openTasks.map((task) => <ListItem key={task.id} title={task.title} titleLines={2} caption={wholeValues(task.key, formatDue(task.due))}
            leading={<Avatar size="md" {...avatarOf(people[task.assignee])} />} />)}
        </List>
      </ListBox>
      {/* Secondary on a phone: hidden there (display none), still in the DOM. ListBox has no hideOn: a Box holds it. */}
      <Box as="aside" hideOn={["mobile"]} aria-labelledby={activityId}>
        <ListBox theme="default" header={<Heading level={headingLevel} id={activityId} textStyle="Heading/Subheading">Since yesterday</Heading>}>
          <List aria-labelledby={activityId}>
            {activity.slice(0, 3).map((item) => (
              <ListItem key={item.id} title={people[item.actor].name} titleLines={1} caption={`${item.verb} ${item.object} · ${formatRelative(item.at)}`}
                leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
            ))}
          </List>
        </ListBox>
      </Box>
    </Grid>
  );
}
