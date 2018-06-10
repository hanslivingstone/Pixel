(function(window) {
    "use strict";
    var $ = window.jQuery;
    var createjs = window.createjs;
    var toastr = window.toastr;

    var Pixel = window.Pixel || {};
    var CANVAS_WIDTH = Pixel.CANVAS_WIDTH;
    var CANVAS_HEIGHT = Pixel.CANVAS_HEIGHT;
    
    var colorOLOR = "rgb(255,255,255)"; // Must stay sync'd with the value in PixelServer.js
    
    var stage;                                          // EaselJS stage
    var pixels;                                         // EaselJS container to store all the pixels
    var zoom = Pixel.CANVAS_INITIAL_ZOOM;               // zoom level
    var isDrawing = false;                              // whether a new pixel to draw is being selected
    var drawingShape = new createjs.Shape();            // shape to render pixel selector
    var selectedColor = "rgb(255,0,0)";                 // color to draw
    let colorPicker;
    
    let wasDrawing = false;
    let startedDrawing = false;

    const BACKGROUND_COLOR = "rgb(255,255,255)"; // Must stay sync'd with the value in PixelServer.js
    const DEFAULT_COLOR = "rgb(208,234,43)";

    var pixelMap = new Array(CANVAS_WIDTH);             // 2D array mapping of pixels
    for (var i = 0; i < CANVAS_WIDTH; i++)
        pixelMap[i] = Array(CANVAS_HEIGHT);

    var pixelRefreshData;

    const endDate = new Date(Date.UTC(2018, 5, 12)); // This value must be sync'd with the value in pixelServer.js

    function uintToRgb(color){
      const mask = 255;
      
      const r = (color >> 16) & mask;
      const g = (color >> 8) & mask;
      const b = color & (mask);
      
      return "rgb(" + r + "," + g + "," + b + ")";
    }
    
    function isActive(){
      return endDate - Date.now() > 0;
    }
    
    /* START PixelSocket CODE */

    var pixelSocket = new PixelSocket(Pixel.PIXEL_SERVER);

    pixelSocket.setCanvasRefreshHandler(function(pixelData) {
        console.log("Received pixel data from server");
        if (!pixels) {
            console.log("Canvas not ready, storing temporarily.")
            pixelRefreshData = pixelData;
            return;
        }
        for (var x = 0; x < CANVAS_WIDTH; x++) {
            for (var y = 0; y < CANVAS_HEIGHT; y++) {
                var color = uintToRgb(pixelData[x + y * CANVAS_WIDTH]);
                pixelMap[x][y]["shape"].graphics.beginFill(color).drawRect(x, y, 1, 1);
                pixelMap[x][y]["color"] = color;
            }
        }
        stage.update();
    });

    pixelSocket.setMessageHandler(function(data) {

        switch (data.action) {
            case "updatePixel":
                console.log("Pixel Update", data.x, data.y, "color", data.color);
                if (!pixels) return;

                pixelMap[data.x][data.y]["shape"].graphics.beginFill(data.color).drawRect(data.x, data.y, 1, 1);
                data["shape"] = pixelMap[data.x][data.y]["shape"];
                pixelMap[data.x][data.y] = data;
                stage.update();
                break;

            case "timer":
                console.log("Timer: ", data.time);
                if (data.type == "toofast")
                    toastr["warning"]("Try again in a little bit", "You're drawing too fast!", {"progressBar": true, "timeOut": data.time});
                break;

            default:
                console.log("Unknown action:", data.action);
                break;
        }

    });

    pixelSocket.onclose = function() {
        toastr["error"]("No Connection to Server", null, {"onclick": null, "timeOut": "0", "extendedTimeOut": "0"});
    };

    console.log("Connecting to ", pixelSocket.server);
    pixelSocket.connect();
    /* END PixelSocket CODE */

    /* Enable pixel selector */
    function startDrawing(color) {
        if(isActive()){
          console.log("Selected Color", color);
          var p = pixels.globalToLocal(stage.mouseX, stage.mouseY);
          selectedColor = color;
          drawingShape.graphics.clear().beginFill(selectedColor).drawRect(0, 0, 1, 1);
          drawingShape.x = Math.floor(p.x);
          drawingShape.y = Math.floor(p.y);
          drawingShape.visible = true;
          isDrawing = true;
          $(screen.canvas).trigger("mousemove");
          stage.update();
          startedDrawing = true;
        }
    }

    window.onChangeColor = function(color){
      selectedColor = color;
      
      $(document.body).removeClass('pan-mode');
      $(document.body).removeClass('pan-mode-panning');
                
      startDrawing(selectedColor);
      
      $("#draw").click();
    };

    /* Disable pixel selector, update canvas, and send data to server */
    function endDrawing(x, y) {
        if (x >= 0 && y >= 0 && x < CANVAS_WIDTH && y < CANVAS_HEIGHT) {
            
            console.log("Drawing to pixel", x, y, selectedColor);
            pixelMap[x][y]["shape"].graphics.beginFill(selectedColor).drawRect(x, y, 1, 1);

            // SEND PIXEL UPDATE TO SERVER!
            pixelSocket.sendPixel(x, y, selectedColor);
        }
        stage.update();
    }

    $(document).keydown(function(e){
        if(e.keyCode === 27 && isActive()){
          if(isDrawing){
            drawingShape.visible = false;
            isDrawing = false;
            stage.update();
      
            $("#pan").click();
            
            $(document.body).addClass('pan-mode');
            $(document.body).addClass('pan-mode-panning');
          }
          else{
            $(document.body).removeClass('pan-mode');
            $(document.body).removeClass('pan-mode-panning');
            
            $("#draw").click();
            startDrawing(selectedColor);
            
          }
        }
    });
    
    $(document).ready(function() {
        $(document.body).addClass("pan-mode");
        
        console.log("Initializing EaselJS Stage");
        stage = new createjs.Stage(Pixel.CANVAS_ELEMENT_ID);

        var context = stage.canvas.getContext("2d");
        context.webkitImageSmoothingEnabled = context.mozImageSmoothingEnabled = false;

        // create a container to store all the pixels
        pixels = new createjs.Container();
        pixels.scaleX = zoom;
        pixels.scaleY = zoom;

        // create shape objects for each pixel and render them
        for (var x = 0; x < CANVAS_WIDTH; x++) {
            for (var y = 0; y < CANVAS_HEIGHT; y++) {
                var shape = new createjs.Shape();
                pixels.addChild(shape);
                pixelMap[x][y] = {"color": BACKGROUND_COLOR, "shape": shape};
            }
        }

        if (pixelRefreshData)
            pixelSocket.refreshCallback(pixelRefreshData);

        pixels.addChild(drawingShape);
        stage.addChild(pixels);

        $(window).trigger("resize");
        pixels.x = (window.innerWidth - (zoom * CANVAS_WIDTH)) / 2;
        pixels.y = (window.innerHeight - (zoom * CANVAS_HEIGHT)) / 2;

        stage.update();
        console.log("Canvas Initialization done.");


        /* User selects the pixel to paint (if selector is active) */
        stage.addEventListener("click", function(e) {
            if (isDrawing){
                var p = pixels.globalToLocal(e.rawX, e.rawY);
                endDrawing(Math.floor(p.x), Math.floor(p.y));
            }
        });
        /* While the selector is active, move it to the pixel over the cursor */
        stage.on("stagemousemove", function(e){
            if (isDrawing) {
                var p = pixels.globalToLocal(e.rawX, e.rawY);
                drawingShape.x = Math.floor(p.x);
                drawingShape.y = Math.floor(p.y);
                stage.update();
            }
        });


        /* Code for panning the canvas around the screen */
        var dragX = 0;
        var dragY = 0;
        pixels.on("mousedown", function(e){
          if(!isDrawing){
            dragX = e.rawX - pixels.x;
            dragY = e.rawY - pixels.y;
            
            $(document.body).addClass('pan-mode-panning');
          }
        });
        
        $(document.body).on("mouseup", function(e){
          $(document.body).removeClass('pan-mode-panning');
        });
        
        pixels.on("pressmove", function(e){
          if(!isDrawing){
            // canvas panning
            pixels.x = e.rawX - dragX;
            pixels.y = e.rawY - dragY;
            stage.update();
          }
        });


        if (window.Pixel === undefined) {
            toastr["error"]("Cannot load Pixel configuration. Check if pixel-config.js exists.", null, {"onclick": null, "timeOut": "0", "extendedTimeOut": "0"});
            return
        }

        if (Pixel.onload) {
            Pixel.onload();
        }
        
        colorPicker = tinycolorpicker(document.getElementById("colorPicker"));
        colorPicker.setColor(DEFAULT_COLOR);
        
        $("#controls").mouseenter(function(){
          if(isDrawing){
            drawingShape.visible = false;
            isDrawing = false;
            stage.update();
            
            wasDrawing = true;
          }
        });
        
        $("#controls").mouseleave(function(){
          if(wasDrawing){
            drawingShape.visible = true;
            isDrawing = true;
            stage.update();
            
            wasDrawing = false;
          }
        });
        
        $('input[type=radio][name=state]').change(function() {
          if (this.value === 'draw') {
            wasDrawing = true;
            
            if(startedDrawing === false){
              startDrawing(DEFAULT_COLOR);
            }
            $(document.body).removeClass('pan-mode');
            $(document.body).removeClass('pan-mode-panning');
          }
          else if (this.value === 'pan') {
            wasDrawing = false;
            $(document.body).addClass('pan-mode');
          }
        });
                
        setInterval(function(){
          let remaining = endDate - new Date();
          
          const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
          remaining %= (24 * 60 * 60 * 1000);
          
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          remaining %= (60 * 60 * 1000);
          
          const minutes = Math.floor(remaining / (60 * 1000));
          remaining %= (60 * 1000);
          
          const seconds = Math.floor(remaining / 1000);
          
          let html = "";
          if(days >= 1){
            html += "<strong>" + days + "</strong> day";
          }
          
          if(days > 1){
            html += "s, ";
          }
          else{
            html += ", "
          }
          
          html += "<strong>" + hours + " : " + minutes + " : " + seconds + " : "+ "</strong> seconds"
          
          $("#clockValue").html(html);  
        }, 1000);


        if(!isActive()){
          $("#controls").remove();
          toastr["info"]("Congratulations, this is your mural.", "The Battle is over!");
        }
        else{
          toastr["info"]("The rules: Draw whatever you want until the clock stops.", "ATG Mural Pixel Fight");
          setTimeout(function() {
               toastr["info"]("Pending Eliot's approval of the content, this will be printed into an mural that spans the wall infront of the colab.");
          }, 3000);
        }
    });

    // zoom functionality
    $(window).on("mousewheel", function(e){
        e.preventDefault();
        zoom = (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) ? zoom + 1 : zoom - 1;
        zoom = Math.min(Math.max(zoom, Pixel.CANVAS_MIN_ZOOM), Pixel.CANVAS_MAX_ZOOM);

        // zoom in/out to cursor position
        var centerX = stage.mouseX;
        var centerY = stage.mouseY;

        var local = pixels.globalToLocal(centerX, centerY);
        pixels.regX = local.x;
        pixels.regY = local.y;
        pixels.x = centerX;
        pixels.y = centerY;
        pixels.scaleX = pixels.scaleY = zoom;
        stage.update();
    });


    $(window).on("resize", function(e){
        // canvas MUST always be a square, otherwise it will get distorted
        stage.canvas.width = stage.canvas.height = Math.max(window.innerHeight, window.innerWidth);
        stage.update();
    });

    Pixel.pixelSocket = pixelSocket;
    Pixel.startDrawing = startDrawing;
    Pixel.endDrawing = endDrawing;
    window.Pixel = Pixel;
})(window);
