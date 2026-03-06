let debugContext = {};

export const setDebugContext = (data) => {
    debugContext = {
        ...debugContext,
        ...data
    };
};

export const getDebugContext = () => {
    return { ...debugContext };
};

export const clearDebugContext = () => {
    debugContext = {};
};