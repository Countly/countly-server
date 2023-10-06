/* global app countlyVue CV countlyCommon Vue countlyGuides countlyGlobal Countly */

(function() {

    // REUSABLE COMPONENTS 

    var WalkthroughComponent = countlyVue.views.create({
        template: CV.T('/guides/templates/walkthrough-component.html'),
        props: {
            value: {
                type: Object,
                required: true
            },
            index: {
                type: Number,
                required: true
            }
        },
        data: function() {
            return {
                isDialogIframeVisible: false
            };
        },
        computed: {
            gradientClass: function() {
                var index = this.index % 4;
                var color = 'blue';
                switch (index) {
                case 0:
                    color = 'blue';
                    break;
                case 1:
                    color = 'green';
                    break;
                case 2:
                    color = 'orange';
                    break;
                case 3:
                    color = 'purple';
                    break;
                }
                return 'walkthrough--' + color;
            }
        },
        methods: {
            openDialog: function() {
                this.isDialogIframeVisible = true;
            },
            closeDialog: function() {
                this.isDialogIframeVisible = false;
            }
        }
    });

    var ArticleComponent = countlyVue.views.create({
        template: CV.T('/guides/templates/article-component.html'),
        props: {
            value: {
                type: Object,
                required: true
            },
            index: {
                type: Number,
                required: true
            }
        }
    });

    var OverviewComponent = countlyVue.views.create({
        template: CV.T('/guides/templates/overview-component.html'),
        props: {
            title: {type: String, required: true},
            description: {type: String, required: true},
            link: {type: String, required: false},
            items: {type: Array, required: false},
            type: {type: String, required: true, default: 'walkthroughs'},
            max: {type: Number, required: false, default: 2}
        },
        components: {
            'walkthrough-component': WalkthroughComponent,
            'article-component': ArticleComponent
        },
        computed: {
            customClass: function() {
                return this.max <= 2 ? 'bu-is-half' : 'bu-is-full';
            },
            wrapperStyle: function() {
                return this.max > 0 ? `max-width:${100 / this.max}%;` : `max-width:50%;`;
            }
        }
    });

    // GLOBAL COMPONENTS

    Vue.component("view-guide", countlyVue.components.create({
        template: CV.T('/guides/templates/dialog.html'),
        mixins: [countlyVue.mixins.i18n],
        components: {
            'article-component': ArticleComponent,
            'walkthrough-component': WalkthroughComponent
        },
        props: {
            tooltip: {
                type: Object,
                default: function() {
                    return {
                        description: "",
                        placement: "bottom-end"
                    };
                }
            }
        },
        data: function() {
            return {
                isButtonVisible: false,
                isDialogVisible: false,
                guideData: {},
                scrollWalkthroughs: {
                    vuescroll: {
                        sizeStrategy: 'number'
                    },
                    scrollPanel: {
                        initialScrollX: false,
                        keepShow: false,
                        scrollingY: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                },
                scrollDialogContent: {
                    // vuescroll: {
                    //     sizeStrategy: 'number'
                    // },
                    scrollPanel: {
                        scrollingX: false,
                        keepShow: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false,
                    }
                },
            };
        },
        created: function() {
            var self = this;
            let sections = this.filterSections(window.location.hash.split('/'));
            while (sections.length > 0 && !self.isButtonVisible) {
                let sectionID = '/' + sections.join('/');
                countlyGuides.fetchEntries({ sectionID }).then(function() {
                    let walkthroughs = countlyGuides.getWalkthroughs(sectionID);
                    let articles = countlyGuides.getArticles(sectionID);
                    if (walkthroughs.length > 0 || articles.length > 0) {
                        self.isButtonVisible = true;
                        self.guideData = countlyGuides.getEntries()[0];
                    }
                });
                sections.pop();
            }
        },
        mounted: function() {
            const link = this.$el.querySelector('.feedback__link');
            link.addEventListener('click', this.fetchAndDisplayWidget);
        },
        methods: {
            onClick: function() {
                this.isDialogVisible = true;
                let mainViewContainer = document.getElementById('main-views-container');
                mainViewContainer.getElementsByClassName('main-view')[0].style.setProperty('overflow', 'hidden', 'important');
            },
            onClose: function() {
                this.isDialogVisible = false;
                let mainViewContainer = document.getElementById('main-views-container');
                mainViewContainer.getElementsByClassName('main-view')[0].style.setProperty('overflow', 'auto', 'important');
            },
            filterSections: function(sections) {
                for (let i = 0; i < sections.length; i++) {
                    if (sections[i] === countlyCommon.ACTIVE_APP_ID) {
                        sections.splice(i, 1);
                        i--;
                    }
                    else if (sections[i] === '#') {
                        sections.splice(i, 1);
                        i--;
                    }
                }
                return sections;
            },
            fetchAndDisplayWidget: function() {
                var domain = countlyGlobal.countly_domain;
                try {
                    var urlObj = new URL(domain);
                    domain = urlObj.hostname;
                }
                catch (_) {
                    // do nothing, domain from config will be used as is
                }
                let COUNTLY_STATS = Countly.init({
                    app_key: "e70ec21cbe19e799472dfaee0adb9223516d238f",
                    url: "https://stats.count.ly",
                    device_id: domain
                });
                COUNTLY_STATS.get_available_feedback_widgets(function(countlyPresentableFeedback, err) {
                    if (err) {
                        //console.log(err);
                        return;
                    }
                    var i = countlyPresentableFeedback.length - 1;
                    var countlyFeedbackWidget = countlyPresentableFeedback[0];
                    while (i--) {
                        if (countlyPresentableFeedback[i].type === 'survey') {
                            countlyFeedbackWidget = countlyPresentableFeedback[i];
                            break;
                        }
                    }
                    var selectorId = "feedback-survey";
                    COUNTLY_STATS.present_feedback_widget(countlyFeedbackWidget, selectorId);
                });
            },
        },
    }));

    // TAB COMPONENTS

    var WalkthroughsComponent = countlyVue.views.create({
        template: CV.T('/guides/templates/walkthroughs-component.html'),
        components: {
            'walkthrough-component': WalkthroughComponent
        },
        props: {
            items: {type: Array, required: false}
        }
    });

    var ArticlesComponent = countlyVue.views.create({
        template: CV.T('/guides/templates/articles-component.html'),
        components: {
            'article-component': ArticleComponent
        },
        props: {
            items: {type: Array, required: false}
        }
    });

    // TABS

    var WalkthroughsTab = countlyVue.views.create({
        template: CV.T('/guides/templates/tab.html'),
        components: {
            'overview-component': OverviewComponent
        },
        data: function() {
            return {
                currentTab: (this.$route.params && this.$route.params.secondaryTab) || "all",
                walkthroughs: [],
                tabs: []
            };
        },
        created: function() {
            var self = this;
            countlyGuides.fetchEntries()
                .then(function() {
                    self.walkthroughs = countlyGuides.getWalkthroughs();
                    self.createTabs();
                })
                .catch(function() {
                    // console.log(error);
                });
        },
        methods: {
            createTabs: function() {
                var self = this;
                var tabs = [
                    {
                        title: CV.i18n('guides.walkthroughs.all'),
                        name: "all",
                        component: WalkthroughsComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs",
                        props: {
                            items: self.walkthroughs
                        }
                    },
                ];
                var sections = [];
                self.walkthroughs.forEach(function(walkthrough) {
                    if (!sections.includes(walkthrough.sectionID)) {
                        sections.push(walkthrough.sectionID);
                        tabs.push({
                            title: countlyCommon.unescapeHtml(walkthrough.sectionTitle),
                            name: walkthrough.sectionID.substring(1),
                            component: WalkthroughsComponent,
                            route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs" + walkthrough.sectionID,
                            props: {
                                items: self.walkthroughs.filter(function(item) {
                                    return item.sectionID === walkthrough.sectionID;
                                })
                            }
                        });
                    }
                });
                self.tabs = tabs;
            }
        }
    });

    var ArticlesTab = countlyVue.views.create({
        template: CV.T('/guides/templates/tab.html'),
        components: {
            'overview-component': OverviewComponent
        },
        data: function() {
            return {
                currentTab: (this.$route.params && this.$route.params.secondaryTab) || "all",
                articles: [],
                tabs: []
            };
        },
        created: function() {
            var self = this;
            countlyGuides.fetchEntries()
                .then(function() {
                    self.articles = countlyGuides.getArticles();
                    self.createTabs();
                })
                .catch(function() {
                    // console.log(error);
                });
        },
        methods: {
            createTabs: function() {
                var self = this;
                var tabs = [
                    {
                        title: CV.i18n('guides.articles.all'),
                        name: "all",
                        component: ArticlesComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles",
                        props: {
                            items: self.articles
                        }
                    },
                ];
                var sections = [];
                self.articles.forEach(function(article) {
                    if (!sections.includes(article.sectionID)) {
                        sections.push(article.sectionID);
                        tabs.push({
                            title: countlyCommon.unescapeHtml(article.sectionTitle),
                            name: article.sectionID.substring(1),
                            component: ArticlesComponent,
                            route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles" + article.sectionID,
                            props: {
                                items: self.articles.filter(function(item) {
                                    return item.sectionID === article.sectionID;
                                })
                            }
                        });
                    }
                });
                self.tabs = tabs;
            }
        }
    });

    var OverviewTab = countlyVue.views.create({
        template: CV.T('/guides/templates/overview-tab.html'),
        components: {
            'overview-component': OverviewComponent
        },
        data: function() {
            return {
                onboardingWalkthroughs: [],
                newWalkthroughs: [],
                suggestionsWalkthroughs: [],
                promotedArticles: []
            };
        },
        created: function() {
            var self = this;
            countlyGuides.fetchEntries({ sectionID: { $in: ['/onboarding', '/new', '/suggestions', '/promoted'] } })
                .then(function() {
                    self.onboardingWalkthroughs = countlyGuides.getWalkthroughs('/onboarding').slice(0, 2);
                    self.newWalkthroughs = countlyGuides.getWalkthroughs('/new').slice(0, 2);
                    self.suggestionsWalkthroughs = countlyGuides.getWalkthroughs('/suggestions').slice(0, 4);
                    self.promotedArticles = countlyGuides.getArticles('/promoted').slice(0, 3);
                })
                .catch(function() {
                    // console.log(error);
                });
        }
    });

    // MAIN VIEW

    var GuidesView = countlyVue.views.create({
        template: CV.T('/guides/templates/guides.html'),
        data: function() {
            return {
                currentTab: (this.$route.params && this.$route.params.primaryTab) || 'overview',
                searchQuery: '',
                tabs: [
                    {
                        title: CV.i18n('guides.overview'),
                        name: "overview",
                        component: OverviewTab,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/overview"
                    },
                    {
                        title: CV.i18n('guides.walkthroughs'),
                        name: "walkthroughs",
                        component: WalkthroughsTab,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/walkthroughs",
                    },
                    {
                        title: CV.i18n('guides.articles'),
                        name: "articles",
                        component: ArticlesTab,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/guides/articles",
                    }
                ]
            };
        },
        methods: {
            onFocus: function() {
                if (this.searchQuery === "") {
                    app.navigate("#/guides/search", true);
                }
            },
            clearSearch: function() {
                this.searchQuery = '';
            },
        }
    });

    // SEARCH VIEWS

    var SearchResultTab = countlyVue.views.create({
        template: CV.T('/guides/templates/search-result-tab.html'),
        props: {
            items: {type: Array, required: false}
        }
    });

    var GuidesSearchView = countlyVue.views.create({
        template: CV.T('/guides/templates/search.html'),
        data: function() {
            return {
                searchQuery: (this.$route.params && this.$route.params.query) || '',
                currentSearchQuery: '',
                currentTab: 'all',
                results: null
            };
        },
        computed: {
            tabs: function() {
                return [
                    {
                        title: CV.i18n('guides.all'),
                        name: "all",
                        component: SearchResultTab,
                        props: {
                            items: this.results
                        }
                    },
                    {
                        title: CV.i18n('guides.walkthroughs'),
                        name: "walkthroughs",
                        component: SearchResultTab,
                        props: {
                            items: this.results && this.results.filter(function(item) {
                                return item.type === "walkthrough";
                            })
                        }
                    },
                    {
                        title: CV.i18n('guides.articles'),
                        name: "articles",
                        component: SearchResultTab,
                        props: {
                            items: this.results && this.results.filter(function(item) {
                                return item.type === "article";
                            })
                        }
                    }
                ];
            },
            resultCount: function() {
                return this.results ? this.results.length : 0;
            }
        },
        methods: {
            OnEnterSearch: function() {
                var self = this;
                if (this.currentSearchQuery !== '') {
                    this.searchQuery = this.currentSearchQuery;
                    countlyGuides.searchEntries(this.searchQuery).then(function(results) {
                        self.results = results;
                        app.navigate("#/guides/search/" + self.searchQuery);
                    });
                }
            },
            clearSearch: function() {
                this.currentSearchQuery = '';
            }
        }
    });

    //ROUTING 

    var getGuidesView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: GuidesView,
            vuex: []
        });
    };

    var getGuidesSearchView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: GuidesSearchView,
            vuex: []
        });
    };

    app.route("/guides", "guides-overview", function() {
        app.navigate("/guides/overview", true);
    });

    app.route("/guides/overview", "guides-overview", function() {
        var guidesView = getGuidesView();
        guidesView.params = {primaryTab: "overview"};
        this.renderWhenReady(guidesView);
    });

    app.route("/guides/walkthroughs", "guides-walkthroughs", function() {
        var guidesView = getGuidesView();
        guidesView.params = {primaryTab: "walkthroughs"};
        this.renderWhenReady(guidesView);
    });

    app.route("/guides/walkthroughs/*secondaryTab", "guides-walkthroughs", function(secondaryTab) {
        var guidesView = getGuidesView();
        guidesView.params = {primaryTab: "walkthroughs", secondaryTab};
        this.renderWhenReady(guidesView);
    });

    app.route("/guides/articles", "guides-articles", function() {
        var guidesView = getGuidesView();
        guidesView.params = {primaryTab: "articles"};
        this.renderWhenReady(guidesView);
    });

    app.route("/guides/articles/*secondaryTab", "guides-articles", function(secondaryTab) {
        var guidesView = getGuidesView();
        guidesView.params = {primaryTab: "articles", secondaryTab};
        this.renderWhenReady(guidesView);
    });

    app.route("/guides/search", "guides-search", function() {
        var searchView = getGuidesSearchView();
        searchView.params = {};
        this.renderWhenReady(searchView);
    });

    app.route("/guides/search/:query", "guides-search-query", function(query) {
        var searchView = getGuidesSearchView();
        searchView.params = {query: query};
        this.renderWhenReady(searchView);
    });

})();