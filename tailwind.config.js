/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [
        require('./design-system/tailwind.config.js')
    ],
    content: [
        "./src/web/templates/**/*.html",
        "./src/web/static/**/*.js"
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
