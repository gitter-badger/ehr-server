var ba = require('basic-auth');

/**
 * a list of string related utilities
 * @type {{extend_or_replace: Function}}
 */
module.exports = {
    /**
     * 1) append str2 to str1 if both not null
     * 2) return str2 if str1 is null and str2 is not
     * 3) return null if both str1 and str2 are null
     * @param str1
     * @param str2
     * @returns (check above)
     */
    extend_or_replace: function (str1, str2) {
        if (!str1) {
            return str2;
        } else if (str2) {
            return (str1 + str2);
        } else {
            return null;
        }
    },

    /**
     * decode basic auth into email and password
     * @param req
     * @returns {*|Object}
     */
    get_user: function (req) {
        return ba(req);
    },

    /**
     *
     * @param lat1 latitude of point 1
     * @param lon1 longitude of point 1
     * @param lat2 latitude of point 2
     * @param lon2 longitude of point 2
     * @param unit = "K" or "N"
     * @returns {number}
     */
    distance: function (lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1 / 180
        var radlat2 = Math.PI * lat2 / 180
        var radlon1 = Math.PI * lon1 / 180
        var radlon2 = Math.PI * lon2 / 180
        var theta = lon1 - lon2
        var radtheta = Math.PI * theta / 180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180 / Math.PI
        dist = dist * 60 * 1.1515
        if (unit == "K") {
            dist = dist * 1.609344
        }
        if (unit == "N") {
            dist = dist * 0.8684
        }
        return dist
    }
};