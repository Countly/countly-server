#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');
const minimist = require('minimist');
const propertiesParser = require('properties-parser');
const glob = require('glob');

const BASE_LANGUAGE = 'en';
const PROPERTIES_FILE_EXTENSION = '.properties';

// Those are paths Countly processes.
const DATA_SOURCE_DIRECTORIES = [
    '/opt/countly/frontend/express/public/localization/dashboard',
    '/opt/countly/frontend/express/public/localization/mail',
    '/opt/countly/frontend/express/public/localization/help',

    // This one must remain the last.
    '/opt/countly/frontend/express/public/localization/custom'
];

const options = {};

const printUsage = () => {
    console.log('Note: The base language is English and cannot be changed through options.');
    console.log();
    console.log('Options:');
    console.log();
    console.log('  --languages <language-list>, -l <language-list>');
    console.log('      Languages are coma separated language code, without spaces. Base language is always included.');
    console.log('      e.g. --languages ja,nl,fr');
    console.log('      Defaults to all available languages.');
    console.log();
    console.log('  --show-exceeding');
    console.log('      Shows the properties that exist in a language and does not in the base language.');
    console.log('      Defaults to false.');
    console.log();
    console.log('  --show-overwrites');
    console.log('      Shows the properties that are overwritten by a new value because defined multiple times.');
    console.log('      Prints only keys of overwritten properties.');
    console.log('      Defaults to false.');
    console.log();
    console.log('  --show-overwrites-values');
    console.log('      Shows the properties that are overwritten by a new value because defined multiple times.');
    console.log('      Prints both keys and values of overwritten properties.');
    console.log('      Defaults to false.');
    console.log();
    console.log('  --recursive, -r');
    console.log('      Search for translation files in sub-directories or top directory only.');
    console.log('      Defaults to false.');
    console.log();
};

const determineLanguage = (fullPath) => {
    // A .properties file is composed as follow:
    // path/filename_<lang>.properties
    // where <lang> can be omitted (base language) and be 2 letters (language code).

    const lastUnderscore = fullPath.lastIndexOf('_'); // Looking for the "filename" and "<lang>" separator.
    const lastDot = fullPath.lastIndexOf('.'); // Looking for the "<lang>" and ".properties" separator.

    if (lastUnderscore >= 0 && lastDot >= 0 && lastDot - lastUnderscore === 3) {
        return fullPath.substring(lastUnderscore + 1, lastDot);
    }

    return BASE_LANGUAGE;
};

const mapFilesWithLanguage = (files) => {
    return files.map((file) => {
        return {
            language: determineLanguage(file),
            file
        };
    });
};

const filterFilesByLanguage = (fileItems) => {
    return fileItems.filter((fileItem) => {
        return !options.languages || options.languages.includes(fileItem.language);
    });
};

const groupBy = (items, keySelectorFunc, elementSelectorFunc) => {
    const groups = {};

    for (const item of items) {
        const groupKey = keySelectorFunc(item);

        let group = groups[groupKey];

        if (!group) {
            group = [];
            groups[groupKey] = group;
        }

        group.push(elementSelectorFunc(item));
    }

    return groups;
};

const groupFilesByLanguage = (files) => {
    files = mapFilesWithLanguage(files);
    files = filterFilesByLanguage(files);

    return groupBy(
        files,
        (fileItem) => fileItem.language, // Groups by language.
        (fileItem) => fileItem.file // Extracts the file part of the FS entry.
    );
};

const readProperties = (file) => {
    const fileContent = fs.readFileSync(file, { encoding: 'utf8' });
    return propertiesParser.parse(fileContent);
};

const printMergePropertiesOverwrites = (language, storage, properties, printValues) => {
    for (const [key, value] of Object.entries(properties)) {
        if (!storage[key]) {
            continue;
        }

        let message = `[${language}] Entry "${key}" overwritten`;
        if (printValues) {
            message += ` ("${storage[key]}" -> "${value}")`;
        }

        console.log(message);
    }
};

const mergeProperties = (storage, properties) => {
    for (const [key, value] of Object.entries(properties)) {
        storage[key] = value;
    }
};

const loadProperties = (languageToFilesMap) => {
    const groups = {};

    for (const [language, files] of Object.entries(languageToFilesMap)) {
        for (const file of files) {
            let group = groups[language];

            if (!group) {
                group = {};
                groups[language] = group;
            }

            const properties = readProperties(file);

            if (options.showOverwrites || options.showOverwritesValues) {
                printMergePropertiesOverwrites(language, group, properties, options.showOverwritesValues);
            }

            mergeProperties(group, properties);
        }
    }

    return groups;
};

const getGlobbingPattern = (directory) => {
    if (options.isRecursive) {
        return `${directory}/**/*${PROPERTIES_FILE_EXTENSION}`;
    }
    return `${directory}/*${PROPERTIES_FILE_EXTENSION}`;
};

const aggregateFiles = (directories) => {
    const allFiles = [];

    const globbingOptions = {
        nodir: true,
        follow: false,
        absolute: true
    };

    for (const directory of directories) {
        const subFiles = glob.sync(getGlobbingPattern(directory), globbingOptions);
        allFiles.push(...subFiles);
    }

    return allFiles;
};

const printMissingProperties = (language, baseProperties, otherProperties) => {
    for (const baseKey of Object.keys(baseProperties)) {
        if (!otherProperties[baseKey]) {
            console.log(`Language "${language}" is missing key "${baseKey}".`);
        }
    }
};

const printExceedingProperties = (language, baseProperties, otherProperties) => {
    for (const key of Object.keys(otherProperties)) {
        if (!baseProperties[key]) {
            console.log(`Language "${language}" has exceeding key "${key}".`);
        }
    }
};

const getArgumentAsArray = (argValue) => {
    if (!argValue) {
        return [];
    }
    return Array.isArray(argValue) ? argValue : [argValue];
};

const assertNonBaseLanguageAvailable = (languages) => {
    // Base language is necessarily present, there must be at least another one.
    assert(languages.size > 1, 'Invalid language option');
};

const setupLanguagesOption = (argv) => {
    if (!argv) {
        return;
    }

    const argumentLanguages = getArgumentAsArray(argv.languages).concat(getArgumentAsArray(argv.l));

    if (argumentLanguages.length === 0) {
        // Property options.languages must not be set in order to mean "all languages".
        return;
    }

    const flattenedLanguages = new Set();

    for (const languages of argumentLanguages) {
        if (typeof languages !== 'string') {
            continue;
        }
        for (const language of languages.split(/\s*,\s*/)) {
            flattenedLanguages.add(language);
        }
    }

    // Ensure base language is present no matter what, otherwise the tool is useless.
    flattenedLanguages.add(BASE_LANGUAGE);

    // At this stage, if there is only one language, it is necessarily the base language, meaning input was wrong.
    assertNonBaseLanguageAvailable(flattenedLanguages);

    argv.languages = [...flattenedLanguages];
};

const setupOptions = () => {
    const argv = minimist(process.argv.slice(2), {
        boolean: [
            'showExceeding',
            'showOverwritesValues',
            'showOverwrites',
            'isRecursive'
        ],
        alias: {
            showExceeding: 'show-exceeding',
            showOverwritesValues: 'show-overwrites-values',
            showOverwrites: 'show-overwrites',
            isRecursive: ['recursive', 'r']
        }
    });

    setupLanguagesOption(argv);

    for (const [key, value] of Object.entries(argv)) {
        options[key] = value;
    }
};

const main = () => {
    setupOptions();

    if (options.h || options.help) {
        printUsage();
        return;
    }

    const propertiesFiles = aggregateFiles(DATA_SOURCE_DIRECTORIES);

    if (propertiesFiles.length === 0) {
        console.log('No translation files to process, exiting.');
        return;
    }

    const languageToFilesMap = groupFilesByLanguage(propertiesFiles);
    const languageToPropertiesMap = loadProperties(languageToFilesMap);

    const baseProperties = languageToPropertiesMap[BASE_LANGUAGE];
    if (!baseProperties) {
        throw new Error('Base language is missing');
    }

    for (const [language, properties] of Object.entries(languageToPropertiesMap)) {
        if (language === BASE_LANGUAGE) {
            continue;
        }

        if (options.showExceeding) {
            printExceedingProperties(language, baseProperties, properties);
        }

        printMissingProperties(language, baseProperties, properties);
    }
};

main();
