let debugContext = {};

export const setDebugContext = (data) => {
    debugContext = {
        ...debugContext,
        ...data
    };
};

export const getDebugContext = () => ({ ...debugContext });

export const clearDebugContext = () => {
    debugContext = {};
};