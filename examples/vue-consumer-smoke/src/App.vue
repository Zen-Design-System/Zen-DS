<script setup lang="ts">
// A wide slice of the API as an app writes it: props in kebab case, an icon by name, a slot, events. vue-tsc checks it
// against the shipped declarations (skipLibCheck: false).
import { ref } from "vue";
import { AlertBanner, Avatar, Badge, Button, Heading, IconButton, ProgressBar, Stack, Text, type ButtonLevel } from "@zen-ds/vue";

const level = ref<ButtonLevel>("primary");
const saves = ref(0);
const showBanner = ref(true);
const tags = ref(["Design", "Research"]);
</script>

<template>
  <Stack gap="lg" padding="margin-comfortable">
    <Heading :level="1">Projects</Heading>
    <Text tone="light">Client and studio work at Dizai Studio.</Text>
    <AlertBanner v-if="showBanner" theme="positive" :on-close="() => (showBanner = false)">Saved {{ saves }} times.</AlertBanner>
    <Stack direction="row" gap="sm" align="center">
      <Button :level="level" start-icon="icon-plus-line" @click="saves++">Save changes</Button>
      <IconButton icon="icon-settings-01-line" level="tertiary" aria-label="Settings" />
      <Badge v-for="tag in tags" :key="tag" theme="blue" @remove="tags = tags.filter((name) => name !== tag)">{{ tag }}</Badge>
    </Stack>
    <Avatar size="md" alt="Alex Duong" />
    <ProgressBar :value="40" aria-label="Upload" />
  </Stack>
</template>
