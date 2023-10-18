function capitalize(text) {
    text = text.toLowerCase();
    return text[0].toUpperCase() + text.slice(1);
}

function toSlug(text) {
    return text.toLowerCase().replace('\'', '').replace('/', '').replace(' ', '-');
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const rgbColor = 'rgb(' + r + ', ' + g + ', ' + b + ')'

    return rgbColor;
}

module.exports = {
    capitalize,
    toSlug,
    hexToRgb
};
