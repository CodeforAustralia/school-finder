module.exports = {
    "globals": {
        // Put things like jQuery, etc
        "jQuery": true,
        "$": true,
        "app": true,
        "google": true,
        "Handlebars": true,
        "ga": true,
        "_": true,
    },
    "env": {
        "browser": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": 0, // TODO disable for production http://eslint.org/docs/rules/no-console
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};