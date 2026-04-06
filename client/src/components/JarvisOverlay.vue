<script setup>
</script>

<template>
  <div class="fixed inset-0 z-40 pointer-events-none">
    <!-- Ambient background blur -->
    <div class="absolute inset-0" style="background: rgba(5, 5, 5, 0.6); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);"></div>
    
    <!-- Main container -->
    <div class="relative w-full h-full flex items-center justify-center p-4 md:p-8 pointer-events-auto">
      <div class="relative w-full max-w-7xl h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl"
           style="background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px);">
        
        <!-- Top accent line -->
        <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
        
        <!-- Bottom accent line -->
        <div class="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        
        <!-- Corner accents -->
        <div class="absolute top-0 left-0 w-8 h-8 border-t border-l border-cyan-500/30 rounded-tl-2xl md:rounded-tl-3xl"></div>
        <div class="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyan-500/30 rounded-tr-2xl md:rounded-tr-3xl"></div>
        <div class="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyan-500/10 rounded-bl-2xl md:rounded-bl-3xl"></div>
        <div class="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyan-500/10 rounded-br-2xl md:rounded-br-3xl"></div>
        
        <!-- Content slot -->
        <div class="relative w-full h-full overflow-hidden">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
