/*
    Pixel Configuration File
    Brandon Asuncion <me@brandonasuncion.tech>
*/

(function(window) {
    "use strict";

    // Pixel Settings
    var Pixel = {
        PIXEL_SERVER: location.origin.replace(/^http/, 'ws'),
        CANVAS_WIDTH: 200, // The width and height must be the same as the values set for the server
        CANVAS_HEIGHT: 50,
        CANVAS_INITIAL_ZOOM: 20,
        CANVAS_MIN_ZOOM: 10,
        CANVAS_MAX_ZOOM: 40,
        CANVAS_ELEMENT_ID: "pixelCanvas",
    };
    window.Pixel = Pixel;

    // toastr Notifications
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-top-center",
        "preventDuplicates": true,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "300",
        "timeOut": "30000",
        "extendedTimeOut": "100",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

})(window);
