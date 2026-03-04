let context = {}

export const setDebugContext = (data) => {
  context = { ...context, ...data }
}

export const getDebugContext = () => context

export const clearDebugContext = () => {
  context = {}
}