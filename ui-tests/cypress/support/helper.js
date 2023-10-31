import moment from 'moment';

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

function calculatePercentageRatings(...ratings) {
    const counts = [0, 0, 0, 0, 0];
    const totalRatingCount = ratings.length;

    ratings.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
            counts[rating - 1]++;
        }
    });

    const percentages = counts.map(count => (count * 100) / totalRatingCount);

    return {
        totalRatingCount,
        counts,
        percentages
    };
}

function getCurrentDate() {
    return moment().format('ddd, DD MMM YYYY');
}

export default {
    capitalize,
    toSlug,
    hexToRgb,
    calculatePercentageRatings,
    getCurrentDate,
};