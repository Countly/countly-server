/**
* Module for dealing with versions
* @module plugins/crashes/api/parts/version
*/

/**
 *  Check if a version string follows some kind of scheme (there is only semantic versioning (semver) for now)
 *  @param {string} inpVersion - an app version string
 *  @return {array} [regex.exec result, version scheme name]
 */
function checkAppVersion(inpVersion) {
    // Regex is from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
    const semverRgx = /(^v?)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    // Half semver is similar to semver but with only one dot
    const halfSemverRgx = /(^v?)(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

    let execResult = semverRgx.exec(inpVersion);

    if (execResult) {
        return [execResult, 'semver'];
    }

    execResult = halfSemverRgx.exec(inpVersion);

    if (execResult) {
        return [execResult, 'halfSemver'];
    }

    return [null, null];
}

module.exports = {
    /**
     *  Transform a version string so it will be numerically correct when sorted
     *  For example '1.10.2' will be transformed to '100001.100010.100002'
     *  So when sorted ascending it will come after '1.2.0' ('100001.100002.100000')
     *  @param {string} inpVersion - an app version string
     *  @return {string} the transformed app version
     */
    transformAppVersion: function(inpVersion) {
        const [execResult, versionScheme] = checkAppVersion(inpVersion);

        if (execResult === null) {
            // Version string does not follow any scheme, just return it
            return inpVersion;
        }

        // Mark version parts based on semver scheme
        let prefixIdx = 1;
        let majorIdx = 2;
        let minorIdx = 3;
        let patchIdx = 4;
        let preReleaseIdx = 5;
        let buildIdx = 6;

        if (versionScheme === 'halfSemver') {
            patchIdx -= 1;
            preReleaseIdx -= 1;
            buildIdx -= 1;
        }

        let transformed = '';
        // Rejoin version parts to a new string
        for (let idx = prefixIdx; idx < buildIdx; idx += 1) {
            let part = execResult[idx];

            if (part) {
                if (idx >= majorIdx && idx <= patchIdx) {
                    part = 100000 + parseInt(part, 10);
                }

                if (idx >= minorIdx && idx <= patchIdx) {
                    part = '.' + part;
                }

                if (idx === preReleaseIdx) {
                    part = '-' + part;
                }

                if (idx === buildIdx) {
                    part = '+' + part;
                }

                transformed += part;
            }
        }

        return transformed;
    }
};
