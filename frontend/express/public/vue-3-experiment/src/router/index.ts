import { createRouter, createWebHashHistory } from 'vue-router'
import RootView from "@/views/Root.vue"

// import plugin routes
import { BoardRoutes } from '@/plugins/boards/router'

// init global router
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: RootView,
    },
    // inject plugin routes
    ...BoardRoutes
  ],
})

export default router
