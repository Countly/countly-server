# Guides plugin

## Overall behaviour

The guides plugin is a core plugin that provides interactive, in-app walkthroughs and articles for users to help them navigate and utilise features within the Countly application.

Guides are enabled if **enableGuides** is set to true in the CMS OR in the API config file (this allows us to enable them for a specific server). If Guides are disabled or no data is available for a specific plugin, we display the tooltip instead of the Guides button.

The Guides plugin data comes from the Countly CMS. When fetched, it is stored in **Countly DB** under the **cms_cache** collection and is refreshed periodically based on the **UPDATE_INTERVAL** variable set in the backend:
If cms_cache is empty or the UPDATE_INTERVAL has passed, the data is fetched from the CMS. We can also force a refresh by calling the **clearCache** endpoint which clears the cms_cache collection.

## File structure

File structure follows usual Countly plugin structure

```
plugins/guides
├── api
├── frontend/public
│   ├── javascripts
│   │   ├── countly.models.js                # Guides model code; transforms backend data
│   │   └── countly.views.js                 # Views code: handles all views/components
│   ├── localization                         # Contains localization files
│   ├── stylesheets                          # Contains stylesheets
│   └── templates
│       ├── guides.html                      # Main guides page template, covering all plugins
│       ├── dialog.html                      # Template for the dialog that displays guides for each plugin
│       ├── search.html                      # Template for the search bar within the guides section
│       ├── search-result-tab.html           # Template for the tab that shows search results in guides
│       ├── tab.html                         # Generic tab template for organising walkthroughs/articles by section
│       ├── articles-component.html          # Component template for a list of articles
│       ├── article-component.html           # Component template for an individual article
│       ├── walkthroughs-component.html      # Component template for a list of walkthroughs
│       ├── walkthrough-component.html       # Component template for an individual walkthrough
│       ├── overview-component.html          # Component template for the overview section of guides
│       └── overview-tab.html                # Template for the tab that displays an overview of guides
│
├── install.js
├── build.js
├── package.json
├── tests.js
└── README.md
```

Other relevant files:

```
frontend
│      ├── express/public/javascripts/countly
│          └── countly.cms.js   # Frontend file where requests to the backend are made
│
api
├── parts/mgmt
│         └── cms.js        # Backend file where requests to the CMS are made
└── config.js         # API config file where we can enable guides

```

## Data structure

The guides data is stored in the **Countly CMS** with the following structure:
```
{
   "data": [
        {
            "id": 1,
            "attributes": {
                "sectionID": "/section",
                "sectionTitle": "Section",
                "createdAt": "date",
                "updatedAt": "date",
                "publishedAt": "date",
                "locale": "en",
                "walkthroughTitle": "Custom title for walkthroughs",
                "walkthroughDescription": "Custom description for walkthroughs",
                "articleTitle": "Custom title for articles",
                "articleDescription": "Custom description for articles",
                "articles": [
                    {
                        "id": 18,
                        "title": "title",
                        "url": "https://support.count.ly/path/to/article"
                    }
                ],
                "walkthroughs": [
                    {
                        "id": 17,
                        "title": "title",
                        "url": "https://demo.arcade.software/walkthrough"
                    },
                    {
                        "id": 5,
                        "title": "title",
                        "url": "https://demo.arcade.software/walkthrough"
                    }
                ],
                "localizations": {
                "data":[]
                }
            }
        }
        ....other sections
    ],
    "meta": {
        "pagination": {
            "page": 1,
            "pageSize": 100,
            "pageCount": 1,
            "total": 1
        }
    }
}

```

When fetched, the data is transformed and stored in the **Countly DB (cms_cache collection)**. The data for each section is stored in a separate document with the _id: "server-guides_{sectionID}"

The document has the following structure:
```
{
    "_id": "server-guides_1",
    "lu": timestamp, 
    "sectionID": "/section",
    "sectionTitle": "Section",
    "createdAt": "date",
    "publishedAt": "date",
    "updatedAt": "date",
    "locale": "en",
    "articleDescription": "Custom description for articles",
    "articleTitle": "Custom title for articles",
    "walkthroughDescription": null,
    "walkthroughTitle": null,
    "articles": [
        {
            "id": 18,
            "title": "title",
            "url": "https://support.count.ly/path/to/article"
        }
    ],
    "walkthroughs": [
        {
            "id": 17,
            "title": "title",
            "url": "https://demo.arcade.software/walkthrough"
        },
        {
            "id": 5,
            "title": "title",
            "url": "https://demo.arcade.software/walkthrough"
        }
    ],
    "localizations": {
        "data": []
    }
}

```
In cms_cache, we also store the Guides configurations (such as whether the plugin is enabled, titles, descriptions etc) with the following structure: 
```
{
    "_id": "server-guide-config_1",
    "enableGuides": true,
    "lu": timestamp,
    "createdAt": "date",
    "publishedAt": "date",
    "updatedAt": "date",
    "articleDescription": "Description",
    "articleTitle": "Title",
    "walkthroughDescription": "Description",
    "walkthroughTitle": "Title"
}
```

Lastly, in cms_cache, we store metadata for guides and guides configurations with the following structure:
The lu (last updated) field lets us know when it is time to refresh the data from the CMS
```
{
  "_id": "server-guides_meta",
  "lu": timestamp
}
```
```
{
  "_id": "server-guide-config_meta",
  "lu": timestamp
}
```