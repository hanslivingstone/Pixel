/*
    Pixel Configuration File
    Brandon Asuncion <me@brandonasuncion.tech>
*/

(function(window) {
    "use strict";

    // Pixel Settings
    var Pixel = {
        PIXEL_SERVER: location.origin.replace(/^http/, 'ws'),
        CANVAS_WIDTH: 50, // The width and height must be the same as the values set for the server
        CANVAS_HEIGHT: 50,
        CANVAS_INITIAL_ZOOM: 20,
        CANVAS_MIN_ZOOM: 10,
        CANVAS_MAX_ZOOM: 40,
        CANVAS_COLORS: ["#eeeeee", "red", "orange", "yellow", "green", "blue", "purple", "#614126", "white", "black"],
        CANVAS_ELEMENT_ID: "pixelCanvas",

        // optional onload()
        onload: function() {
            toastr["info"]("The rules: Draw whatever you want until the clock stops.", "ATG Mural Pixel Fight");
            setTimeout(function() {
                 toastr["info"]("Pending Eliot's approval of the content, this will be printed into an 8 foot mural that goes infront of the colab.");
            }, 3000);
        }
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
