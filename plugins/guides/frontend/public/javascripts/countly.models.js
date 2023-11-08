/*global countlyCMS */

(function(countlyGuides) {

    const API_key = "server-guides";

    // eslint-disable-next-line require-jsdoc
    function transformItems(entry, items = [], type) {
        return items.map(function(item) {
            return Object.assign({}, item, { id: entry._id + "_" + type + "_" + item.id, sectionID: entry.sectionID, sectionTitle: entry.sectionTitle });
        });
    }

    var _entries = [];

    countlyGuides.fetchEntries = function(query, refresh) {
        return new Promise(function(resolve, reject) {
            countlyCMS.fetchEntry(API_key, {populate: true, query, refresh})
                .then(function(data) {
                    let entries = data.data;
                    if (entries && entries.length > 0) {
                        for (let i = 0; i < entries.length; i++) {
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
    };

    countlyGuides.getEntries = function() {
        return _entries;
    };

    countlyGuides.getEntry = function(sectionID) {
        return _entries.find(function(entry) {
            return entry.sectionID === sectionID;
        });
    };

    countlyGuides.getWalkthroughs = function(sectionID) {
        let entries = _entries;
        if (sectionID) {
            entries = _entries.filter(function(entry) {
                return entry.sectionID === sectionID;
            });
        }
        let walkthroughs = [];
        for (let i = 0; i < entries.length; i++) {
            walkthroughs = walkthroughs.concat(entries[i].walkthroughs);
        }
        return walkthroughs;
    };

    countlyGuides.getArticles = function(sectionID) {
        let entries = _entries;
        if (sectionID) {
            entries = _entries.filter(function(entry) {
                return entry.sectionID === sectionID;
            });
        }
        let articles = [];
        for (let i = 0; i < entries.length; i++) {
            articles = articles.concat(entries[i].articles);
        }
        return articles;
    };

    countlyGuides.searchEntries = function(searchKey) {
        return new Promise(function(resolve, reject) {
            //fetch entries where at least one the articles or walkthroughs contains the search query (in their title or description)
            let query = {
                $or: [
                    {
                        "articles": {
                            $elemMatch: {
                                $or: [
                                    {
                                        "title": {
                                            $regex: searchKey,
                                            $options: "i"
                                        }
                                    },
                                    {
                                        "description": {
                                            $regex: searchKey,
                                            $options: "i"
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    {
                        "walkthroughs": {
                            $elemMatch: {
                                $or: [
                                    {
                                        "title": {
                                            $regex: searchKey,
                                            $options: "i"
                                        }
                                    },
                                    {
                                        "description": {
                                            $regex: searchKey,
                                            $options: "i"
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            };
            countlyGuides.fetchEntries(query)
                .then(function(entries) {
                    //filter out the results keeping only the articles and walkthroughs that match the search query. Concat them in a single array and add a type property to each item
                    let results = [];
                    entries.forEach(function(entry) {
                        let walkthroughs = entry.walkthroughs.filter(function(walkthrough) {
                            return (walkthrough.title && walkthrough.title.toLowerCase().includes(searchKey.toLowerCase())) || (walkthrough.description && walkthrough.description.toLowerCase().includes(searchKey.toLowerCase()));
                        });
                        walkthroughs.forEach(function(walkthrough) {
                            walkthrough.type = "walkthrough";
                        });
                        let articles = entry.articles.filter(function(article) {
                            return (article.title && article.title.toLowerCase().includes(searchKey.toLowerCase())) || (article.description && article.description.toLowerCase().includes(searchKey.toLowerCase()));
                        });
                        articles.forEach(function(article) {
                            article.type = "article";
                        });
                        results = results.concat(articles).concat(walkthroughs);
                    });
                    resolve(results);
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    };

}(window.countlyGuides = window.countlyGuides || {}));