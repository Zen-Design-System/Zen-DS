/**
 * Template: empty and error states. Copy it into your app and replace the copy and actions.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useState } from "react";
import { Box, Container, EmptyState, Grid, InlineMessage, Search, Segmented, Stack } from "@zen/design-system";

type Variant = "not-found" | "no-results" | "first-use" | "error";

/** A full-page 404, a search with no results, a first-use empty list and a failed load with Retry. */
export function EmptyErrorTemplate() {
  const [variant, setVariant] = useState<Variant>("no-results");
  const [query, setQuery] = useState("quarterly report");
  const [attempts, setAttempts] = useState(0);
  return (
    <Container maxWidth="md">
      <Stack gap="lg" paddingY="lg">
        <Segmented aria-label="State" level="secondary" value={variant} onValueChange={(value) => setVariant(value as Variant)}
          options={[{ id: "not-found", label: "404" }, { id: "no-results", label: "No results" }, { id: "first-use", label: "First use" }, { id: "error", label: "Load failed" }]} />

        {variant === "not-found" ? (
          <Box padding="3xl">
            <EmptyState title="Page not found" icon="icon-file-search-line" primaryAction={{ label: "Go to dashboard", onClick: () => setVariant("first-use") }} secondaryAction={{ label: "Contact support", onClick: () => setVariant("error") }}>
              The page may have moved or you may not have access. Check the address or go back to the dashboard.
            </EmptyState>
          </Box>
        ) : null}

        {variant === "no-results" ? (
          <Stack gap="md">
            <Search aria-label="Search files" placeholder="Search files" value={query} onValueChange={setQuery} />
            <Box surface="surface" border="pale" radius="xl" padding="xl">
              <EmptyState title={query ? `No files match “${query}”` : "Type to search"} illustration={false} icon="icon-search-medium-line" secondaryAction={query ? { label: "Clear search", onClick: () => setQuery("") } : undefined}>
                {query ? "Check the spelling or try a shorter search." : "Search by file name or owner."}
              </EmptyState>
            </Box>
          </Stack>
        ) : null}

        {variant === "first-use" ? (
          <Grid columns={1}>
            <Box surface="surface" border="pale" radius="xl" padding="xl">
              <EmptyState title="Create your first project" icon="icon-folder-plus-line" primaryAction={{ label: "New project", onClick: () => setVariant("no-results") }} secondaryAction={{ label: "Import from Figma", onClick: () => setVariant("no-results") }}>
                Projects keep files, members and tasks together.
              </EmptyState>
            </Box>
          </Grid>
        ) : null}

        {variant === "error" ? (
          <Stack gap="md">
            <InlineMessage theme="negative" title="Couldn’t load your projects" action={{ label: "Try again", onClick: () => setAttempts((count) => count + 1) }}>
              {attempts ? `Still failing after ${attempts} ${attempts === 1 ? "retry" : "retries"}. Check your connection.` : "The server didn’t respond. Your data is safe."}
            </InlineMessage>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
