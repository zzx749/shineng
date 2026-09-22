<template>
  <teleport to="body">
    <transition name="success">
      <div v-if="visible" class="login-success">
        <svg class="checkmark" viewBox="0 0 52 52">
          <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
          <path class="checkmark-check" fill="none" d="M14 27 l7 7 l16 -16" />
        </svg>
        <div class="success-text">{{ title }}</div>
        <div v-if="subtitle" class="success-sub">{{ subtitle }}</div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '登录成功' },
  subtitle: { type: String, default: '' },
})
</script>
