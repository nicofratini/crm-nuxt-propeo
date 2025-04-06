<template>
  <div class="flex flex-col items-center gap-4 bg-white p-6 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold text-gray-800">{{ label }}</h2>
    <div class="flex items-center gap-4">
      <button
        :title="decrementTitle"
        @click="count--"
        class="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
        aria-label="Decrease"
      >
        <Icon name="lucide:minus" class="w-5 h-5 text-red-600" />
      </button>
      <span class="text-3xl font-bold min-w-[3ch] text-center">{{ count }}</span>
      <button
        @click="count++"
        class="p-2 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
        aria-label="Increase"
      >
        <Icon name="lucide:plus" class="w-5 h-5 text-green-600" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  decrementTitle: string;
  initialValue?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: 0
});

const count = ref(props.initialValue);
</script>