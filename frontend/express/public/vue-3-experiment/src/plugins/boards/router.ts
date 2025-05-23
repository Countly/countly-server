import BoardNext from "./components/BoardNext.vue";

export const BoardRoutes = [
    {
        name: 'boards-next-root',
        path: '/:id/boards-next',
        component: BoardNext,
        props: true
    }
];