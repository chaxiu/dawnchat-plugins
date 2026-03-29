<script setup lang="ts">
import CardHost from "../../../components/CardHost.vue";
import { useAssistantCards } from "../../../runtime/assistantCards";

const { cards } = useAssistantCards();
</script>

<template>
  <CardHost :cards="cards" />
</template>
