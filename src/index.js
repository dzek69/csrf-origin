const { URL } = require("url");

/**
 * @typedef {number} Mode
 */

/**
 * @enum {Mode}
 */
const MODES = {
    WHITELIST: 0,
    BLACKLIST: 1,
    CUSTOM: 2,
};

/**
 * @typedef {number} ResponseType
 */

/**
 * @enum {ResponseType}
 */
const RESPONSE_TYPES = {
    PLAIN: 0,
    JSON: 1,
    CUSTOM: 2,
};

const DEFAULT_MESSAGE = "Bad request. CSRF protection in effect. You may need to disable ad-block or privacy-related " +
    "browser extensions.";

/**
 * @typedef {Object} CSRFOptions
 * @property {Mode} [listMode] - mode in which list will be processed (white & blacklist, custom callback),
 * defaults to whitelist mode
 * @property {Array} [list] - list of origins, defaults to empty list
 * @property {function} [listCallback] - if mode is set to custom this function will decide if origin should be allowed
 * @property {number} [responseCode] - this http code will be set on request block
 * @property {ResponseType} [responseMode] - how blocked response should be send (plain text/json/custom callback)
 * @property {string} [responseMessage] - response message to show on request block
 * @property {function} [responseCallback] - custom callback to handle response blocking
 * @property {function} [requestFilter] - pre-filters the request even before origin matching, using this method request
 * can be always allowed (without origin check), always rejected or still let origin matching decide
 */

/**
 * Creates CSRF Origin/Referer -based middleware
 *
 * @param {CSRFOptions} [options] - middleware options
 * @returns {function}
 */
const createMiddleware = (options = {}) => {
    const {
        listMode = MODES.WHITELIST,
        list = [],
        listCallback = null,
        responseCode = 400,
        responseMode = RESPONSE_TYPES.PLAIN,
        responseMessage = DEFAULT_MESSAGE,
        responseCallback = null,
        requestFilter = null,
    } = options;

    const originList = list.map(origin => (new URL(origin)).origin);

    return function(req, res, allow) {
        const block = function blockRequest() {
            res.status(responseCode);

            switch (responseMode) {
                case RESPONSE_TYPES.JSON:
                    res.json({
                        error: true,
                        message: responseMessage,
                    });
                    return;
                case RESPONSE_TYPES.CUSTOM:
                    if (responseCallback) {
                        return responseCallback(req, res);
                    }
                default: // Fall-through is expected
                    res.send(responseMessage);
            }
        };

        if (requestFilter) {
            const result = requestFilter(req);
            if (result === true) {
                return allow();
            }
            if (result === false) {
                return block();
            }
            // this can't be if-else, as we want to allow non-bool value as "let origin decide"
        }

        const rawOrigin = req.headers.origin || req.headers.referer;
        console.log(rawOrigin, req.headers.origin, req.headers.referer);
        if (!rawOrigin) {
            return block();
        }

        let origin;
        try {
            origin = (new URL(rawOrigin)).origin;
            console.log(origin);
        }
        catch (e) {
            return block();
        }

        switch (listMode) {
            case MODES.BLACKLIST:
                const isBlacklisted = originList.some(originItem => origin === originItem);
                if (isBlacklisted) {
                    return block();
                }
                return allow();
            case MODES.CUSTOM:
                if (listCallback) {
                    const isAllowed = listCallback(origin, req);
                    if (isAllowed) {
                        return allow();
                    }
                }
                return block();
            default:
                console.log(originList, );
                const isWhitelisted = originList.some(originItem => origin === originItem);
                if (isWhitelisted) {
                    return allow();
                }
                return block();
        }
    }
};
createMiddleware.MODES = MODES;
createMiddleware.RESPONSE_TYPES = RESPONSE_TYPES;

module.exports = createMiddleware;