import { ajax } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import countlyCMS from '../../../../../frontend/express/public/javascripts/countly/countly.cms.js';

var API_key = "server-guides";

function transformItems(entry, items, type) {
    items = items || [];
    return items.map(function(item) {
        return Object.assign({}, item, { id: entry._id + "_" + type + "_" + item.id, sectionID: entry.sectionID, sectionTitle: entry.sectionTitle });
    });
}

var _entries = [];

function memberViewedGuides(user_id) {
    ajax({
        type: "POST",
        url: "/guides/viewed",
        dataType: "json",
        data: {
            "user_id": user_id,
            _csrf: countlyGlobal.csrf_token,
        }
    });
}

function fetchEntries(query, refresh) {
    return new Promise(function(resolve, reject) {
        countlyCMS.fetchEntry(API_key, {populate: true, query: query, refresh: refresh})
            .then(function(data) {
                var entries = data.data;
                if (entries && entries.length > 0) {
                    for (var i = 0; i < entries.length; i++) {
                        entries[i].walkthroughs = transformItems(entries[i], entries[i].walkthroughs, "w");
                        entries[i].articles = transformItems(entries[i], entries[i].articles, "a");
                    }
                }
                _entries = entries;
                resolve(entries);
            })
            .catch(function(error) {
                reject(error);
            });
    });
}

function getEntries() {
    return _entries;
}

function getEntry(sectionID) {
    return _entries.find(function(entry) {
        return entry.sectionID === sectionID;
    });
}

function getWalkthroughs(sectionID) {
    var entries = _entries;
    if (sectionID) {
        entries = _entries.filter(function(entry) {
            return entry.sectionID === sectionID;
        });
    }
    var walkthroughs = [];
    for (var i = 0; i < entries.length; i++) {
        walkthroughs = walkthroughs.concat(entries[i].walkthroughs);
    }
    return walkthroughs;
}

function getArticles(sectionID) {
    var entries = _entries;
    if (sectionID) {
        entries = _entries.filter(function(entry) {
            return entry.sectionID === sectionID;
        });
    }
    var articles = [];
    for (var i = 0; i < entries.length; i++) {
        articles = articles.concat(entries[i].articles);
    }
    return articles;
}

function searchEntries(searchKey) {
    return new Promise(function(resolve, reject) {
        var query = {
            $or: [
                {
                    "articles": {
                        $elemMatch: {
                            $or: [
                                { "title": { $regex: searchKey, $options: "i" } },
                                { "description": { $regex: searchKey, $options: "i" } }
                            ]
                        }
                    }
                },
                {
                    "walkthroughs": {
                        $elemMatch: {
                            $or: [
                                { "title": { $regex: searchKey, $options: "i" } },
                                { "description": { $regex: searchKey, $options: "i" } }
                            ]
                        }
                    }
                }
            ]
        };
        fetchEntries(query)
            .then(function(entries) {
                var results = [];
                entries.forEach(function(entry) {
                    var wt = entry.walkthroughs.filter(function(walkthrough) {
                        return (walkthrough.title && walkthrough.title.toLowerCase().includes(searchKey.toLowerCase())) || (walkthrough.description && walkthrough.description.toLowerCase().includes(searchKey.toLowerCase()));
                    });
                    wt.forEach(function(walkthrough) {
                        walkthrough.type = "walkthrough";
                    });
                    var art = entry.articles.filter(function(article) {
                        return (article.title && article.title.toLowerCase().includes(searchKey.toLowerCase())) || (article.description && article.description.toLowerCase().includes(searchKey.toLowerCase()));
                    });
                    art.forEach(function(article) {
                        article.type = "article";
                    });
                    results = results.concat(art).concat(wt);
                });
                resolve(results);
            })
            .catch(function(error) {
                reject(error);
            });
    });
}

var countlyGuides = {
    memberViewedGuides: memberViewedGuides,
    fetchEntries: fetchEntries,
    getEntries: getEntries,
    getEntry: getEntry,
    getWalkthroughs: getWalkthroughs,
    getArticles: getArticles,
    searchEntries: searchEntries,
};

window.countlyGuides = countlyGuides;

export default countlyGuides;
